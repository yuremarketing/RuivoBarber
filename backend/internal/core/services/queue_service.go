package services

import (
	"context"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type QueueService struct {
	repo ports.QueueRepository
}

func NewQueueService(repo ports.QueueRepository) *QueueService {
	return &QueueService{repo: repo}
}

func (s *QueueService) RegistrarCheckIn(ctx context.Context, agendamentoID int) error {
	return s.repo.RegistrarCheckIn(ctx, agendamentoID)
}

func (s *QueueService) RegistrarEmCadeira(ctx context.Context, agendamentoID int) error {
	return s.repo.RegistrarEmCadeira(ctx, agendamentoID)
}

func (s *QueueService) ObterMetricas(ctx context.Context, barbeiroID *int) (*domain.QueueMetrics, error) {
	return s.repo.ObterMetricas(ctx, barbeiroID)
}
