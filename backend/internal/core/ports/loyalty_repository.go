package ports

import (
	"context"
	"time"
	"ruivobarber-api/internal/core/domain"
)

type LoyaltyRepository interface {
	ObterCheckInInfo(ctx context.Context, userID int) (streak int, ultimoCheckIn *time.Time, err error)
	RealizarCheckIn(ctx context.Context, userID int, novoStreak int, xpGanhado, moedasGanhadas int) (*domain.CheckInResponse, error)
}
