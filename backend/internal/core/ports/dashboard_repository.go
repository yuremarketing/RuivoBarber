package ports

import "ruivobarber-api/internal/core/domain"

type DashboardRepository interface {
	GetDashboardData() (*domain.DashboardData, error)
}
