package services

import (
	"context"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type QueueService struct {
	repo   ports.QueueRepository
	sseHub *SSEHub
}

func NewQueueService(repo ports.QueueRepository, sseHub *SSEHub) *QueueService {
	return &QueueService{repo: repo, sseHub: sseHub}
}

func (s *QueueService) RegistrarCheckIn(ctx context.Context, agendamentoID int) error {
	barbeiroID, err := s.repo.RegistrarCheckIn(ctx, agendamentoID)
	if err != nil {
		return err
	}

	// Notificar o barbeiro em tempo real que o cliente chegou
	if s.sseHub != nil {
		s.sseHub.BroadcastToBarbeiro(barbeiroID, "checkin")
	}

	return nil
}

func (s *QueueService) RegistrarEmCadeira(ctx context.Context, agendamentoID int) error {
	return s.repo.RegistrarEmCadeira(ctx, agendamentoID)
}

func (s *QueueService) ObterMetricas(ctx context.Context, barbeiroID *int) (*domain.QueueMetrics, error) {
	return s.repo.ObterMetricas(ctx, barbeiroID)
}
