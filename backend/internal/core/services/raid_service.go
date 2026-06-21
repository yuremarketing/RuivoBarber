package services

import (
	"context"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type RaidService struct {
	repo ports.RaidRepository
}

func NewRaidService(repo ports.RaidRepository) *RaidService {
	return &RaidService{repo: repo}
}

func (s *RaidService) ObterStatusRaidAtiva(ctx context.Context, userID int) (*domain.RaidStatusResponse, error) {
	raid, err := s.repo.ObterRaidAtiva(ctx, userID)
	if err != nil {
		return nil, err
	}
	if raid == nil {
		return &domain.RaidStatusResponse{
			Raid:                 nil,
			MinhaContribuicao:    0,
			PodeResgatar:         false,
			RecompensaResgatada:  false,
		}, nil
	}

	contrib, resgatada, err := s.repo.ObterStatusContribuicao(ctx, raid.ID, userID)
	if err != nil {
		return nil, err
	}

	podeResgatar := (raid.Status == "Concluido" || raid.Progresso >= raid.Meta) && contrib > 0 && !resgatada

	return &domain.RaidStatusResponse{
		Raid:                 raid,
		MinhaContribuicao:    contrib,
		PodeResgatar:         podeResgatar,
		RecompensaResgatada:  resgatada,
	}, nil
}

func (s *RaidService) ResgatarRecompensa(ctx context.Context, raidID, userID int) error {
	return s.repo.ResgatarRecompensaRaid(ctx, raidID, userID)
}
