package repositories

import (
	"context"
	"database/sql"
	"errors"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type LivePgRepository struct {
	db *sql.DB
}

func NewLivePgRepository(db *sql.DB) ports.LiveRepository {
	return &LivePgRepository{db: db}
}

func (r *LivePgRepository) Criar(ctx context.Context, live *domain.Live) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if live.Ativa {
		_, err := tx.ExecContext(ctx, "UPDATE Lives SET Ativa = FALSE")
		if err != nil {
			return err
		}
	}

	query := `
		INSERT INTO Lives (Titulo, Url, Plataforma, Ativa, CriadoEm)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING ID, CriadoEm
	`
	err = tx.QueryRowContext(ctx, query, live.Titulo, live.Url, live.Plataforma, live.Ativa).Scan(&live.ID, &live.CriadoEm)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *LivePgRepository) Listar(ctx context.Context) ([]domain.Live, error) {
	query := "SELECT ID, Titulo, Url, Plataforma, Ativa, CriadoEm FROM Lives ORDER BY CriadoEm DESC"
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lives []domain.Live
	for rows.Next() {
		var l domain.Live
		err := rows.Scan(&l.ID, &l.Titulo, &l.Url, &l.Plataforma, &l.Ativa, &l.CriadoEm)
		if err != nil {
			return nil, err
		}
		lives = append(lives, l)
	}
	return lives, nil
}

func (r *LivePgRepository) ObterAtiva(ctx context.Context) (*domain.Live, error) {
	query := "SELECT ID, Titulo, Url, Plataforma, Ativa, CriadoEm FROM Lives WHERE Ativa = TRUE LIMIT 1"
	var l domain.Live
	err := r.db.QueryRowContext(ctx, query).Scan(&l.ID, &l.Titulo, &l.Url, &l.Plataforma, &l.Ativa, &l.CriadoEm)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &l, nil
}

func (r *LivePgRepository) Ativar(ctx context.Context, id int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var exists bool
	err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM Lives WHERE ID = $1)", id).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("live não encontrada")
	}

	_, err = tx.ExecContext(ctx, "UPDATE Lives SET Ativa = FALSE")
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, "UPDATE Lives SET Ativa = TRUE WHERE ID = $1", id)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *LivePgRepository) Excluir(ctx context.Context, id int) error {
	query := "DELETE FROM Lives WHERE ID = $1"
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return errors.New("live não encontrada para exclusão")
	}
	return nil
}
