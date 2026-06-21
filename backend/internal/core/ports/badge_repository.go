package ports

import (
	"context"
	"ruivobarber-api/internal/core/domain"
)

type BadgeRepository interface {
	ListBadgesWithUnlockStatus(ctx context.Context, userID int) ([]domain.Badge, error)
}
