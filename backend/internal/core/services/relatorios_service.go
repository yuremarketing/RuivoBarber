package services

import (
	"context"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type RelatoriosService struct {
	repo ports.RelatoriosRepository
}

func NewRelatoriosService(repo ports.RelatoriosRepository) *RelatoriosService {
	return &RelatoriosService{repo: repo}
}

func (s *RelatoriosService) ObterResumoComissoes(ctx context.Context, dataInicio, dataFim string) (*domain.ResumoFinanceiro, error) {
	return s.repo.ObterResumoComissoes(ctx, dataInicio, dataFim)
}
