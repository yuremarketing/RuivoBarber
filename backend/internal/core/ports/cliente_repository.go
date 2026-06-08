package ports

import "ruivobarber-api/internal/core/domain"

type ClienteRepository interface {
    FindAll() ([]domain.Cliente, error)
    FindByID(id int) (*domain.Cliente, error)
    Save(c *domain.Cliente) error
    ConcluirAtendimento(agendamentoID int) error
    RegistrarFalta(agendamentoID int) error
}
