package ports

import (
	"context"
	"ruivobarber-api/internal/core/domain"
)

type QuestRepository interface {
	EnsureWeeklyQuests(ctx context.Context, semanaAno string) error
	ListWeeklyQuestsProgress(ctx context.Context, claID int, semanaAno string) ([]domain.ClanQuestProgress, error)
	IncrementQuestProgress(ctx context.Context, claID int, semanaAno, tipoRequisito string, incremento int) error
}
