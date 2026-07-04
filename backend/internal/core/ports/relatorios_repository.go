package ports

import (
	"context"
	"ruivobarber-api/internal/core/domain"
)

type RelatoriosRepository interface {
	ObterResumoComissoes(ctx context.Context, dataInicio, dataFim string) (*domain.ResumoFinanceiro, error)
}
