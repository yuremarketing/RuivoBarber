package ports

import (
	"context"
	"ruivobarber-api/internal/core/domain"
)

type QueueRepository interface {
	RegistrarCheckIn(ctx context.Context, agendamentoID int) error
	RegistrarEmCadeira(ctx context.Context, agendamentoID int) error
	ObterMetricas(ctx context.Context, barbeiroID *int) (*domain.QueueMetrics, error)
}
