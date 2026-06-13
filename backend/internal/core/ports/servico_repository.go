package ports

import "ruivobarber-api/internal/core/domain"

type ServicoRepository interface {
	FindAll() ([]domain.Servico, error)
	FindByID(id int) (*domain.Servico, error)
	Save(s *domain.Servico) error
}
