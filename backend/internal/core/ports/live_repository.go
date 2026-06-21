package ports

import (
	"context"
	"ruivobarber-api/internal/core/domain"
)

type LiveRepository interface {
	Criar(ctx context.Context, live *domain.Live) error
	Listar(ctx context.Context) ([]domain.Live, error)
	ObterAtiva(ctx context.Context) (*domain.Live, error)
	Ativar(ctx context.Context, id int) error
	Excluir(ctx context.Context, id int) error
}
