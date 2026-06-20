package services

import (
	"context"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type BadgeService struct {
	repo ports.BadgeRepository
}

func NewBadgeService(repo ports.BadgeRepository) *BadgeService {
	return &BadgeService{repo: repo}
}

func (s *BadgeService) ListarBadgesDoUsuario(ctx context.Context, userID int) ([]domain.Badge, error) {
	return s.repo.ListBadgesWithUnlockStatus(ctx, userID)
}
