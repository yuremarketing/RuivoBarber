package repositories

import (
	"context"
	"database/sql"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type QuestPgRepository struct {
	db *sql.DB
}

func NewQuestPgRepository(db *sql.DB) ports.QuestRepository {
	return &QuestPgRepository{db: db}
}

func (r *QuestPgRepository) EnsureWeeklyQuests(ctx context.Context, semanaAno string) error {
	var count int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM ClaMissoesSemanais WHERE SemanaAno = $1", semanaAno).Scan(&count)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	rows, err := r.db.QueryContext(ctx, "SELECT id FROM ClaMissoes ORDER BY RANDOM() LIMIT 3")
	if err != nil {
		return err
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return err
		}
		ids = append(ids, id)
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, id := range ids {
		_, err := tx.ExecContext(ctx, "INSERT INTO ClaMissoesSemanais (SemanaAno, MissaoID) VALUES ($1, $2)", semanaAno, id)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *QuestPgRepository) ListWeeklyQuestsProgress(ctx context.Context, claID int, semanaAno string) ([]domain.ClanQuestProgress, error) {
	query := `
		SELECT m.id, m.descricao, m.meta, m.tiporequisito, m.xpbonus,
		       COALESCE(p.progresso, 0) AS progresso,
		       COALESCE(p.completada, FALSE) AS completada,
		       p.completadaem
		FROM ClaMissoesSemanais s
		JOIN ClaMissoes m ON s.missaoid = m.id
		LEFT JOIN ClaMissoesProgresso p ON s.missaoid = p.missaoid AND p.claid = $1 AND p.semanaano = $2
		WHERE s.semanaano = $2
		ORDER BY m.id ASC
	`
	rows, err := r.db.QueryContext(ctx, query, claID, semanaAno)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []domain.ClanQuestProgress
	for rows.Next() {
		var q domain.ClanQuestProgress
		var completadaEm sql.NullTime
		err := rows.Scan(
			&q.QuestID, &q.Descricao, &q.Meta, &q.TipoRequisito, &q.XpBonus,
			&q.Progresso, &q.Completada, &completadaEm,
		)
		if err != nil {
			return nil, err
		}
		if completadaEm.Valid {
			q.CompletadaEm = &completadaEm.Time
		}
		results = append(results, q)
	}
	return results, nil
}

func (r *QuestPgRepository) IncrementQuestProgress(ctx context.Context, claID int, semanaAno, tipoRequisito string, incremento int) error {
	queryActive := `
		SELECT m.id, m.meta, m.xpbonus, COALESCE(p.progresso, 0), COALESCE(p.completada, FALSE)
		FROM ClaMissoesSemanais s
		JOIN ClaMissoes m ON s.missaoid = m.id
		LEFT JOIN ClaMissoesProgresso p ON s.missaoid = p.missaoid AND p.claid = $1 AND p.semanaano = $2
		WHERE s.semanaano = $2 AND m.tiporequisito = $3
	`
	rows, err := r.db.QueryContext(ctx, queryActive, claID, semanaAno, tipoRequisito)
	if err != nil {
		return err
	}
	defer rows.Close()

	type questState struct {
		id         int
		meta       int
		xpBonus    int
		progresso  int
		completada bool
	}
	var quests []questState
	for rows.Next() {
		var q questState
		if err := rows.Scan(&q.id, &q.meta, &q.xpBonus, &q.progresso, &q.completada); err != nil {
			return err
		}
		quests = append(quests, q)
	}
	rows.Close()

	if len(quests) == 0 {
		return nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, q := range quests {
		if q.completada {
			continue
		}

		novoProgresso := q.progresso + incremento
		completou := false
		if novoProgresso >= q.meta {
			novoProgresso = q.meta
			completou = true
		}

		var exists bool
		err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM ClaMissoesProgresso WHERE claid = $1 AND missaoid = $2 AND semanaano = $3)", claID, q.id, semanaAno).Scan(&exists)
		if err != nil {
			return err
		}

		if exists {
			if completou {
				_, err = tx.ExecContext(ctx, "UPDATE ClaMissoesProgresso SET progresso = $1, completada = TRUE, completadaem = NOW() WHERE claid = $2 AND missaoid = $3 AND semanaano = $4", novoProgresso, claID, q.id, semanaAno)
			} else {
				_, err = tx.ExecContext(ctx, "UPDATE ClaMissoesProgresso SET progresso = $1 WHERE claid = $2 AND missaoid = $3 AND semanaano = $4", novoProgresso, claID, q.id, semanaAno)
			}
		} else {
			if completou {
				_, err = tx.ExecContext(ctx, "INSERT INTO ClaMissoesProgresso (claid, missaoid, semanaano, progresso, completada, completadaem) VALUES ($1, $2, $3, $4, TRUE, NOW())", claID, q.id, semanaAno, novoProgresso)
			} else {
				_, err = tx.ExecContext(ctx, "INSERT INTO ClaMissoesProgresso (claid, missaoid, semanaano, progresso) VALUES ($1, $2, $3, $4)", claID, q.id, semanaAno, novoProgresso)
			}
		}
		if err != nil {
			return err
		}

		if completou {
			var xpColetivo, nivelAtual int
			err = tx.QueryRowContext(ctx, "UPDATE Clas SET xpcoletivo = xpcoletivo + $1 WHERE id = $2 RETURNING xpcoletivo, nivelatual", q.xpBonus, claID).Scan(&xpColetivo, &nivelAtual)
			if err != nil {
				return err
			}

			novoNivel := 1
			if xpColetivo >= 100 {
				novoNivel = 5
				levelRequirement := 100
				for lvl := 5; ; lvl++ {
					nextReq := levelRequirement + (lvl * 25)
					if xpColetivo >= nextReq {
						novoNivel = lvl + 1
						levelRequirement = nextReq
					} else {
						break
					}
				}
			} else if xpColetivo >= 60 {
				novoNivel = 4
			} else if xpColetivo >= 30 {
				novoNivel = 3
			} else if xpColetivo >= 10 {
				novoNivel = 2
			}

			if novoNivel > nivelAtual {
				_, err = tx.ExecContext(ctx, "UPDATE Clas SET nivelatual = $1 WHERE id = $2", novoNivel, claID)
				if err != nil {
					return err
				}
			}
		}
	}

	return tx.Commit()
}
