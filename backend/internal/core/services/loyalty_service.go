package services

import (
	"context"
	"errors"
	"time"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type LoyaltyService struct {
	repo ports.LoyaltyRepository
}

func NewLoyaltyService(repo ports.LoyaltyRepository) *LoyaltyService {
	return &LoyaltyService{repo: repo}
}

func (s *LoyaltyService) RealizarCheckIn(ctx context.Context, userID int) (*domain.CheckInResponse, error) {
	streak, ultimoCheckIn, err := s.repo.ObterCheckInInfo(ctx, userID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	todayStart := startOfDay(now)

	var novoStreak int
	if ultimoCheckIn == nil {
		novoStreak = 1
	} else {
		lastCheckInStart := startOfDay(*ultimoCheckIn)
		if lastCheckInStart.Equal(todayStart) {
			return nil, errors.New("você já resgatou sua recompensa diária hoje")
		} else if lastCheckInStart.Equal(todayStart.AddDate(0, 0, -1)) {
			novoStreak = streak + 1
		} else {
			novoStreak = 1
		}
	}

	xpGanhado := 10
	moedasGanhadas := 10

	// Marco de bônus: a cada 7 dias consecutivos
	if novoStreak%7 == 0 {
		xpGanhado += 40
		moedasGanhadas += 40
	}

	return s.repo.RealizarCheckIn(ctx, userID, novoStreak, xpGanhado, moedasGanhadas)
}

func startOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}
