package ports

import (
	"context"
	"ruivobarber-api/internal/core/domain"
)

type RaidRepository interface {
	ObterRaidAtiva(ctx context.Context, userID int) (*domain.Raid, error)
	ObterStatusContribuicao(ctx context.Context, raidID, userID int) (contribuicao int, resgatada bool, err error)
	ResgatarRecompensaRaid(ctx context.Context, raidID, userID int) error
}
