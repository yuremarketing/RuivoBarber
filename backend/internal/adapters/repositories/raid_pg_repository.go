package repositories

import (
	"context"
	"database/sql"
	"errors"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type RaidPgRepository struct {
	db *sql.DB
}

func NewRaidPgRepository(db *sql.DB) ports.RaidRepository {
	return &RaidPgRepository{db: db}
}

func (r *RaidPgRepository) ObterRaidAtiva(ctx context.Context, userID int) (*domain.Raid, error) {
	query := `
		SELECT id, nome, descricao, meta, progresso, tiporequisito, recompensaxp, recompensamoedas, datainicio, datafim, status
		FROM Raids
		WHERE (status = 'Ativo' AND NOW() BETWEEN datainicio AND datafim)
		   OR (status = 'Concluido' AND id IN (SELECT raidid FROM RaidContribuicoes WHERE usuarioid = $1 AND recompensaresgatada = FALSE))
		ORDER BY status ASC, id DESC
		LIMIT 1
	`
	var rad domain.Raid
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&rad.ID, &rad.Nome, &rad.Descricao, &rad.Meta, &rad.Progresso,
		&rad.TipoRequisito, &rad.RecompensaXp, &rad.RecompensaMoedas,
		&rad.DataInicio, &rad.DataFim, &rad.Status,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &rad, nil
}

func (r *RaidPgRepository) ObterStatusContribuicao(ctx context.Context, raidID, userID int) (contribuicao int, resgatada bool, err error) {
	query := "SELECT contribuicao, recompensaresgatada FROM RaidContribuicoes WHERE raidid = $1 AND usuarioid = $2"
	err = r.db.QueryRowContext(ctx, query, raidID, userID).Scan(&contribuicao, &resgatada)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, false, nil
		}
		return 0, false, err
	}
	return contribuicao, resgatada, nil
}

func (r *RaidPgRepository) ResgatarRecompensaRaid(ctx context.Context, raidID, userID int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Obter info da Raid e verificar status/conclusão
	var status string
	var meta, progresso, xp, moedas int
	err = tx.QueryRowContext(ctx, "SELECT status, meta, progresso, recompensaxp, recompensamoedas FROM Raids WHERE id = $1 FOR UPDATE", raidID).Scan(&status, &meta, &progresso, &xp, &moedas)
	if err != nil {
		return err
	}
	if status != "Concluido" && progresso < meta {
		return errors.New("esta raid ainda não foi concluída")
	}

	// 2. Verificar se o usuário contribuiu e se já resgatou
	var contrib int
	var resgatada bool
	err = tx.QueryRowContext(ctx, "SELECT contribuicao, recompensaresgatada FROM RaidContribuicoes WHERE raidid = $1 AND usuarioid = $2 FOR UPDATE", raidID, userID).Scan(&contrib, &resgatada)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("você não participou desta raid")
		}
		return err
	}
	if contrib <= 0 {
		return errors.New("você não participou desta raid")
	}
	if resgatada {
		return errors.New("você já resgatou a recompensa desta raid")
	}

	// 3. Marcar a recompensa como resgatada
	_, err = tx.ExecContext(ctx, "UPDATE RaidContribuicoes SET recompensaresgatada = TRUE WHERE raidid = $1 AND usuarioid = $2", raidID, userID)
	if err != nil {
		return err
	}

	// 4. Obter progresso atual do cliente
	var xpAtual, nivelAtual, moedasAtuais int
	var existe bool
	err = tx.QueryRowContext(ctx, "SELECT xpatual, nivelatual, moedas FROM ProgressoCliente WHERE clienteid = $1 FOR UPDATE", userID).Scan(&xpAtual, &nivelAtual, &moedasAtuais)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			xpAtual = 0
			nivelAtual = 1
			moedasAtuais = 0
			existe = false
		} else {
			return err
		}
	} else {
		existe = true
	}

	// 5. Atualizar XP e moedas
	xpAtual += xp
	moedasAtuais += moedas

	// 6. Recalcular nível do jogador
	type NivelInfo struct {
		ID           int
		NomeDoNivel  string
		XpNecessario int
	}
	rows, err := tx.QueryContext(ctx, "SELECT id, nomedonivel, xpnecessario FROM Niveis ORDER BY xpnecessario ASC")
	if err != nil {
		return err
	}
	defer rows.Close()

	var niveis []NivelInfo
	for rows.Next() {
		var n NivelInfo
		if err := rows.Scan(&n.ID, &n.NomeDoNivel, &n.XpNecessario); err != nil {
			return err
		}
		niveis = append(niveis, n)
	}

	calculatedNivel := 1
	for _, l := range niveis {
		if xpAtual >= l.XpNecessario {
			calculatedNivel = l.ID
		}
	}

	var nextXp int = 100
	maxLevelReached := true
	for _, l := range niveis {
		if xpAtual < l.XpNecessario {
			nextXp = l.XpNecessario
			maxLevelReached = false
			break
		}
	}

	var pct float64
	if maxLevelReached {
		pct = 100.00
	} else {
		pct = (float64(xpAtual) / float64(nextXp)) * 100.00
		if pct > 100.00 {
			pct = 100.00
		}
	}

	if existe {
		_, err = tx.ExecContext(ctx, "UPDATE ProgressoCliente SET xpatual = $1, nivelatual = $2, barrapercentual = $3, moedas = $4, updatedat = NOW() WHERE clienteid = $5", xpAtual, calculatedNivel, pct, moedasAtuais, userID)
	} else {
		_, err = tx.ExecContext(ctx, "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual, moedas) VALUES ($1, $2, $3, $4, $5)", userID, xpAtual, calculatedNivel, pct, moedasAtuais)
	}
	if err != nil {
		return err
	}

	return tx.Commit()
}
