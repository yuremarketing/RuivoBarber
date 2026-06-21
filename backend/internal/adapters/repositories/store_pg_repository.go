package repositories

import (
	"context"
	"database/sql"
	"errors"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
)

type StorePgRepository struct {
	db *sql.DB
}

func NewStorePgRepository(db *sql.DB) ports.StoreRepository {
	return &StorePgRepository{db: db}
}

func (r *StorePgRepository) ListItems(ctx context.Context, userID int) ([]domain.StoreItem, error) {
	query := `
		SELECT i.id, i.nome, i.descricao, i.preco, i.tipoitem, i.styleclass, i.criadoem,
		       (ui.usuarioid IS NOT NULL) AS comprado,
		       COALESCE(ui.equipado, FALSE) AS equipado
		FROM ItensLoja i
		LEFT JOIN UsuarioItens ui ON i.id = ui.itemid AND ui.usuarioid = $1
		ORDER BY i.id ASC
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.StoreItem
	for rows.Next() {
		var item domain.StoreItem
		err := rows.Scan(
			&item.ID, &item.Nome, &item.Descricao, &item.Preco, &item.TipoItem,
			&item.StyleClass, &item.CriadoEm, &item.Comprado, &item.Equipado,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *StorePgRepository) GetItemByID(ctx context.Context, itemID int) (*domain.StoreItem, error) {
	var item domain.StoreItem
	query := `SELECT id, nome, descricao, preco, tipoitem, styleclass, criadoem FROM ItensLoja WHERE id = $1`
	err := r.db.QueryRowContext(ctx, query, itemID).Scan(
		&item.ID, &item.Nome, &item.Descricao, &item.Preco, &item.TipoItem, &item.StyleClass, &item.CriadoEm,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *StorePgRepository) GetUserCoins(ctx context.Context, userID int) (int, error) {
	var coins int
	query := `SELECT COALESCE(moedas, 0) FROM ProgressoCliente WHERE clienteid = $1`
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&coins)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return coins, nil
}

func (r *StorePgRepository) HasUserBoughtItem(ctx context.Context, userID, itemID int) (bool, error) {
	var bought bool
	query := `SELECT EXISTS(SELECT 1 FROM UsuarioItens WHERE usuarioid = $1 AND itemid = $2)`
	err := r.db.QueryRowContext(ctx, query, userID, itemID).Scan(&bought)
	return bought, err
}

func (r *StorePgRepository) BuyItem(ctx context.Context, userID, itemID int, cost int) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Deduct cost
	_, err = tx.ExecContext(ctx, "UPDATE ProgressoCliente SET moedas = moedas - $1 WHERE clienteid = $2", cost, userID)
	if err != nil {
		return err
	}

	// Insert purchase record
	_, err = tx.ExecContext(ctx, "INSERT INTO UsuarioItens (usuarioid, itemid, equipado) VALUES ($1, $2, FALSE)", userID, itemID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *StorePgRepository) EquipItem(ctx context.Context, userID, itemID int, tipoItem string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Desequipar itens do mesmo tipo
	_, err = tx.ExecContext(ctx, `
		UPDATE UsuarioItens ui 
		SET equipado = FALSE 
		FROM ItensLoja i 
		WHERE ui.itemid = i.id AND ui.usuarioid = $1 AND i.tipoitem = $2
	`, userID, tipoItem)
	if err != nil {
		return err
	}

	// Equipar o item selecionado
	_, err = tx.ExecContext(ctx, "UPDATE UsuarioItens SET equipado = TRUE WHERE usuarioid = $1 AND itemid = $2", userID, itemID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *StorePgRepository) DesequiparItem(ctx context.Context, userID, itemID int) error {
	_, err := r.db.ExecContext(ctx, "UPDATE UsuarioItens SET equipado = FALSE WHERE usuarioid = $1 AND itemid = $2", userID, itemID)
	return err
}
