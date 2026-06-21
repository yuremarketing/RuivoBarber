package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type QuestServiceImpl struct {
	questRepo ports.QuestRepository
	db        *sql.DB
}

func NewQuestService(questRepo ports.QuestRepository, db *sql.DB) *QuestServiceImpl {
	return &QuestServiceImpl{
		questRepo: questRepo,
		db:        db,
	}
}

func (s *QuestServiceImpl) ListWeeklyQuests(ctx context.Context, userID int) ([]domain.ClanQuestProgress, error) {
	year, week := time.Now().ISOWeek()
	semanaAno := fmt.Sprintf("%d-W%02d", year, week)

	if err := s.questRepo.EnsureWeeklyQuests(ctx, semanaAno); err != nil {
		return nil, err
	}

	var claID int
	err := s.db.QueryRowContext(ctx, "SELECT claid FROM ClaMembros WHERE usuarioid = $1", userID).Scan(&claID)
	if err != nil {
		if err == sql.ErrNoRows {
			return s.questRepo.ListWeeklyQuestsProgress(ctx, 0, semanaAno)
		}
		return nil, err
	}

	return s.questRepo.ListWeeklyQuestsProgress(ctx, claID, semanaAno)
}

func (s *QuestServiceImpl) StartWeeklyQuestsWorker(ctx context.Context) {
	go func() {
		log.Println("📅 WeeklyQuestsWorker assíncrono iniciado com sucesso")
		for {
			year, week := time.Now().ISOWeek()
			semanaAno := fmt.Sprintf("%d-W%02d", year, week)

			err := s.questRepo.EnsureWeeklyQuests(ctx, semanaAno)
			if err != nil {
				log.Printf("❌ [WeeklyQuestsWorker] Erro ao garantir missões semanais: %v", err)
			}

			select {
			case <-ctx.Done():
				return
			case <-time.After(1 * time.Hour):
			}
		}
	}()
}
