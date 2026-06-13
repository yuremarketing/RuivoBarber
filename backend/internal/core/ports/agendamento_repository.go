package ports

import "ruivobarber-api/internal/core/domain"

type AgendamentoRepository interface {
	FindAll() ([]domain.Agendamento, error)
	FindByID(id int) (*domain.Agendamento, error)
	Save(a *domain.Agendamento) error
	UpdateStatus(id int, status string) error
}
