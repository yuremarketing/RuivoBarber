package ports

import "ruivobarber-api/internal/core/domain"

type ClienteRepository interface {
    FindAll() ([]domain.Cliente, error)
    FindByID(id int) (*domain.Cliente, error)
    FindByLogin(login string) (*domain.Cliente, string, error)
    Save(c *domain.Cliente, hashedSenha string) error
    ConcluirAtendimento(agendamentoID int) (*NotificationEvent, error)
    RegistrarFalta(agendamentoID int) error
    ResgatarCupom(clienteID, nivelID int) (*domain.Cupom, error)
    ValidarCupom(codigo string) (*domain.Cupom, error)
}
