package repositories

import (
	"database/sql"
	"ruivobarber-api/internal/core/domain"
)

type TemporadaPgRepository struct {
	db *sql.DB
}

func NewTemporadaPgRepository(db *sql.DB) *TemporadaPgRepository {
	return &TemporadaPgRepository{db: db}
}

func (r *TemporadaPgRepository) FindAll() ([]domain.Temporada, error) {
	query := "SELECT id, nome, datainicio, datafim, ativa, criadaem FROM Temporadas ORDER BY datainicio DESC"
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var temporadas []domain.Temporada
	for rows.Next() {
		var t domain.Temporada
		err := rows.Scan(&t.ID, &t.Nome, &t.DataInicio, &t.DataFim, &t.Ativa, &t.CriadaEm)
		if err != nil {
			return nil, err
		}
		temporadas = append(temporadas, t)
	}
	return temporadas, nil
}

func (r *TemporadaPgRepository) FindByID(id int) (*domain.Temporada, error) {
	var t domain.Temporada
	query := "SELECT id, nome, datainicio, datafim, ativa, criadaem FROM Temporadas WHERE id = $1"
	err := r.db.QueryRow(query, id).Scan(&t.ID, &t.Nome, &t.DataInicio, &t.DataFim, &t.Ativa, &t.CriadaEm)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *TemporadaPgRepository) FindActive() (*domain.Temporada, error) {
	var t domain.Temporada
	query := "SELECT id, nome, datainicio, datafim, ativa, criadaem FROM Temporadas WHERE ativa = true LIMIT 1"
	err := r.db.QueryRow(query).Scan(&t.ID, &t.Nome, &t.DataInicio, &t.DataFim, &t.Ativa, &t.CriadaEm)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Sem temporada ativa
		}
		return nil, err
	}
	return &t, nil
}

func (r *TemporadaPgRepository) Save(t *domain.Temporada) error {
	query := "INSERT INTO Temporadas (nome, datainicio, datafim, ativa) VALUES ($1, $2, $3, $4) RETURNING id, criadaem"
	return r.db.QueryRow(query, t.Nome, t.DataInicio, t.DataFim, t.Ativa).Scan(&t.ID, &t.CriadaEm)
}

func (r *TemporadaPgRepository) Update(t *domain.Temporada) error {
	query := "UPDATE Temporadas SET nome = $1, datainicio = $2, datafim = $3, ativa = $4 WHERE id = $5"
	_, err := r.db.Exec(query, t.Nome, t.DataInicio, t.DataFim, t.Ativa, t.ID)
	return err
}

func (r *TemporadaPgRepository) DeactivateAll() error {
	query := "UPDATE Temporadas SET ativa = false WHERE ativa = true"
	_, err := r.db.Exec(query)
	return err
}
