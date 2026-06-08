package services

import (
    "ruivobarber-api/internal/core/domain"
    "ruivobarber-api/internal/core/ports"
)

type ClienteService struct {
    repo ports.ClienteRepository
}

func NewClienteService(repo ports.ClienteRepository) *ClienteService {
    return &ClienteService{repo: repo}
}

func (s *ClienteService) ListarClientes() ([]domain.Cliente, error) {
    return s.repo.FindAll()
}

func (s *ClienteService) BuscarCliente(id int) (*domain.Cliente, error) {
    return s.repo.FindByID(id)
}


