package ports

import "ruivobarber-api/internal/core/domain"

type TemporadaRepository interface {
	FindAll() ([]domain.Temporada, error)
	FindByID(id int) (*domain.Temporada, error)
	FindActive() (*domain.Temporada, error)
	Save(t *domain.Temporada) error
	Update(t *domain.Temporada) error
	DeactivateAll() error
}
