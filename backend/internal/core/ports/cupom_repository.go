package ports

import "ruivobarber-api/internal/core/domain"

type CupomRepository interface {
	FindAll() ([]domain.Cupom, error)
	FindByID(id int) (*domain.Cupom, error)
	Save(c *domain.Cupom) error
	MarkAsUsed(id int) error
	FindByCodigo(codigo string) (*domain.Cupom, error)
}
