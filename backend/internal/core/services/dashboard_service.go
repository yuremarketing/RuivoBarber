package services

import (
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type DashboardService struct {
	repo ports.DashboardRepository
}

func NewDashboardService(repo ports.DashboardRepository) *DashboardService {
	return &DashboardService{repo: repo}
}

func (s *DashboardService) GetDashboardData() (*domain.DashboardData, error) {
	return s.repo.GetDashboardData()
}
