package services

import (
    "ruivobarber-api/internal/core/domain"
    "ruivobarber-api/internal/core/ports"
)

type ClienteService struct {
    repo     ports.ClienteRepository
    notifier ports.NotificationService
}

func NewClienteService(repo ports.ClienteRepository, notifier ports.NotificationService) *ClienteService {
    return &ClienteService{repo: repo, notifier: notifier}
}

func (s *ClienteService) ListarClientes() ([]domain.Cliente, error) {
    return s.repo.FindAll()
}

func (s *ClienteService) BuscarCliente(id int) (*domain.Cliente, error) {
    return s.repo.FindByID(id)
}

func (s *ClienteService) ConcluirAtendimento(agendamentoID int) error {
    event, err := s.repo.ConcluirAtendimento(agendamentoID)
    if err != nil {
        return err
    }
    s.notifier.EnqueueNotification(*event)
    return nil
}

func (s *ClienteService) RegistrarFalta(agendamentoID int) error {
    return s.repo.RegistrarFalta(agendamentoID)
}

func (s *ClienteService) ResgatarCupom(clienteID, nivelID int) (*domain.Cupom, error) {
    return s.repo.ResgatarCupom(clienteID, nivelID)
}

func (s *ClienteService) ValidarCupom(codigo string) (*domain.Cupom, error) {
    return s.repo.ValidarCupom(codigo)
}



