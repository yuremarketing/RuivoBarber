package services

import (
	"context"
	"errors"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type StoreService struct {
	repo ports.StoreRepository
}

func NewStoreService(repo ports.StoreRepository) *StoreService {
	return &StoreService{repo: repo}
}

func (s *StoreService) ListarItens(ctx context.Context, userID int) ([]domain.StoreItem, error) {
	return s.repo.ListItems(ctx, userID)
}

func (s *StoreService) ComprarItem(ctx context.Context, userID, itemID int) error {
	item, err := s.repo.GetItemByID(ctx, itemID)
	if err != nil {
		return err
	}
	if item == nil {
		return errors.New("item não encontrado")
	}

	possui, err := s.repo.HasUserBoughtItem(ctx, userID, itemID)
	if err != nil {
		return err
	}
	if possui {
		return errors.New("você já possui este item")
	}

	moedas, err := s.repo.GetUserCoins(ctx, userID)
	if err != nil {
		return err
	}
	if moedas < item.Preco {
		return errors.New("saldo de moedas insuficiente")
	}

	return s.repo.BuyItem(ctx, userID, itemID, item.Preco)
}

func (s *StoreService) EquiparItem(ctx context.Context, userID, itemID int) error {
	item, err := s.repo.GetItemByID(ctx, itemID)
	if err != nil {
		return err
	}
	if item == nil {
		return errors.New("item não encontrado")
	}

	possui, err := s.repo.HasUserBoughtItem(ctx, userID, itemID)
	if err != nil {
		return err
	}
	if !possui {
		return errors.New("você não possui este item")
	}

	return s.repo.EquipItem(ctx, userID, itemID, item.TipoItem)
}

func (s *StoreService) DesequiparItem(ctx context.Context, userID, itemID int) error {
	possui, err := s.repo.HasUserBoughtItem(ctx, userID, itemID)
	if err != nil {
		return err
	}
	if !possui {
		return errors.New("você não possui este item")
	}

	return s.repo.DesequiparItem(ctx, userID, itemID)
}
