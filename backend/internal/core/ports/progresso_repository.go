package ports

import "ruivobarber-api/internal/core/domain"

type ProgressoRepository interface {
	FindByClienteID(clienteID int) (*domain.ProgressoCliente, error)
	Save(p *domain.ProgressoCliente) error
	UpdateXP(clienteID int, novoXP int, novoNivel int, novaBarraPercentual float64) error
}
