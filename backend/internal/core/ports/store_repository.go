package ports

import (
	"context"
	"ruivobarber-api/internal/core/domain"
)

type StoreRepository interface {
	ListItems(ctx context.Context, userID int) ([]domain.StoreItem, error)
	GetItemByID(ctx context.Context, itemID int) (*domain.StoreItem, error)
	GetUserCoins(ctx context.Context, userID int) (int, error)
	HasUserBoughtItem(ctx context.Context, userID, itemID int) (bool, error)
	BuyItem(ctx context.Context, userID, itemID int, cost int) error
	EquipItem(ctx context.Context, userID, itemID int, tipoItem string) error
	DesequiparItem(ctx context.Context, userID, itemID int) error
}
