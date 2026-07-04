package repositories

import (
	"fmt"

	"context"
	"database/sql"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
	"ruivobarber-api/internal/pkg/contextutils"
)

type PdvPgRepository struct {
	db *sql.DB
}

func NewPdvPgRepository(db *sql.DB) ports.PdvRepository {
	return &PdvPgRepository{db: db}
}

func (r *PdvPgRepository) AbrirCaixa(ctx context.Context, operadorID int, saldoInicial float64) (int, error) {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return 0, err
	}
	query := `INSERT INTO Caixas (operadorid, saldoinicial, status, tenant_id) VALUES ($1, $2, 'Aberto', $3) RETURNING id`
	var id int
	err = r.db.QueryRowContext(ctx, query, operadorID, saldoInicial, tenantID).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *PdvPgRepository) FecharCaixa(ctx context.Context, caixaID int, saldoFinal float64, saldoInformado float64) error {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return err
	}
	query := `UPDATE Caixas SET status = 'Fechado', saldofinal = $1, saldoinformado = $2, fechadoem = NOW() WHERE id = $3 AND tenant_id = $4`
	_, err = r.db.ExecContext(ctx, query, saldoFinal, saldoInformado, caixaID, tenantID)
	return err
}

func (r *PdvPgRepository) ObterCaixaAtivo(ctx context.Context, operadorID int) (*domain.Caixa, error) {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return nil, err
	}
	query := `SELECT id, operadorid, saldoinicial, saldofinal, saldoinformado, status, abertoem, fechadoem FROM Caixas WHERE operadorid = $1 AND status = 'Aberto' AND tenant_id = $2`
	var c domain.Caixa
	var operadorIDNull sql.NullInt64
	var saldoFinalNull, saldoInformadoNull sql.NullFloat64
	var fechadoEmNull sql.NullTime

	err = r.db.QueryRowContext(ctx, query, operadorID, tenantID).Scan(&c.ID, &operadorIDNull, &c.SaldoInicial, &saldoFinalNull, &saldoInformadoNull, &c.Status, &c.AbertoEm, &fechadoEmNull)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if operadorIDNull.Valid {
		v := int(operadorIDNull.Int64)
		c.OperadorID = &v
	}
	if saldoFinalNull.Valid {
		c.SaldoFinal = &saldoFinalNull.Float64
	}
	if saldoInformadoNull.Valid {
		c.SaldoInformado = &saldoInformadoNull.Float64
	}
	if fechadoEmNull.Valid {
		c.FechadoEm = &fechadoEmNull.Time
	}

	return &c, nil
}

func (r *PdvPgRepository) ObterCaixaPorID(ctx context.Context, caixaID int) (*domain.Caixa, error) {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return nil, err
	}
	query := `SELECT id, operadorid, saldoinicial, saldofinal, saldoinformado, status, abertoem, fechadoem FROM Caixas WHERE id = $1 AND tenant_id = $2`
	var c domain.Caixa
	var operadorIDNull sql.NullInt64
	var saldoFinalNull, saldoInformadoNull sql.NullFloat64
	var fechadoEmNull sql.NullTime

	err = r.db.QueryRowContext(ctx, query, caixaID, tenantID).Scan(&c.ID, &operadorIDNull, &c.SaldoInicial, &saldoFinalNull, &saldoInformadoNull, &c.Status, &c.AbertoEm, &fechadoEmNull)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	if operadorIDNull.Valid {
		v := int(operadorIDNull.Int64)
		c.OperadorID = &v
	}
	if saldoFinalNull.Valid {
		c.SaldoFinal = &saldoFinalNull.Float64
	}
	if saldoInformadoNull.Valid {
		c.SaldoInformado = &saldoInformadoNull.Float64
	}
	if fechadoEmNull.Valid {
		c.FechadoEm = &fechadoEmNull.Time
	}

	return &c, nil
}

func (r *PdvPgRepository) AdicionarMovimentacaoCaixa(ctx context.Context, mc *domain.MovimentacaoCaixa) error {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return err
	}
	query := `INSERT INTO MovimentacoesCaixa (caixaid, tipo, valor, motivo, tenant_id) VALUES ($1, $2, $3, $4, $5)`
	_, err = r.db.ExecContext(ctx, query, mc.CaixaID, mc.Tipo, mc.Valor, mc.Motivo, tenantID)
	return err
}

func (r *PdvPgRepository) ObterMovimentacoesCaixa(ctx context.Context, caixaID int) ([]domain.MovimentacaoCaixa, error) {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return nil, err
	}
	query := `SELECT id, caixaid, tipo, valor, motivo, criadoem FROM MovimentacoesCaixa WHERE caixaid = $1 AND tenant_id = $2 ORDER BY criadoem ASC`
	rows, err := r.db.QueryContext(ctx, query, caixaID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mcs []domain.MovimentacaoCaixa
	for rows.Next() {
		var mc domain.MovimentacaoCaixa
		err := rows.Scan(&mc.ID, &mc.CaixaID, &mc.Tipo, &mc.Valor, &mc.Motivo, &mc.CriadoEm)
		if err != nil {
			return nil, err
		}
		mcs = append(mcs, mc)
	}
	return mcs, nil
}

func (r *PdvPgRepository) AdicionarVenda(ctx context.Context, venda *domain.Venda, itens []domain.VendaItem) error {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Inserir a venda
	queryVenda := `
		INSERT INTO Vendas (caixaid, clienteid, agendamentoid, valorbruto, desconto, valorliquido, metodopagamento, tenant_id, status_pagamento, gateway_id, idempotency_key)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, criadoem
	`
	err = tx.QueryRowContext(ctx, queryVenda,
		venda.CaixaID, venda.ClienteID, venda.AgendamentoID,
		venda.ValorBruto, venda.Desconto, venda.ValorLiquido, venda.MetodoPagamento, tenantID,
		venda.StatusPagamento, venda.GatewayID, venda.IdempotencyKey,
	).Scan(&venda.ID, &venda.CriadoEm)
	if err != nil {
		return err
	}

	// 2. Inserir os itens
	queryItem := `
		INSERT INTO VendaItens (vendaid, servicoid, precounitario, quantidade, tenant_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	for i := range itens {
		itens[i].VendaID = venda.ID
		err = tx.QueryRowContext(ctx, queryItem,
			itens[i].VendaID, itens[i].ServicoID, itens[i].PrecoUnitario, itens[i].Quantidade, tenantID,
		).Scan(&itens[i].ID)
		if err != nil {
			return err
		}

		if venda.ClienteID == nil && itens[i].ServicoID != nil {
			queryProdutos := `
				SELECT produtoid, quantidadenecessaria
				FROM ServicoProdutos
				WHERE servicoid = $1
			`
			rows, err := tx.QueryContext(ctx, queryProdutos, *itens[i].ServicoID)
			if err != nil {
				return err
			}
			
			type ProdInfo struct {
				ProdutoID int
				QtdNec    int
			}
			var prods []ProdInfo
			for rows.Next() {
				var p ProdInfo
				if err := rows.Scan(&p.ProdutoID, &p.QtdNec); err != nil {
					rows.Close()
					return err
				}
				prods = append(prods, p)
			}
			rows.Close()

			for _, p := range prods {
				_, err = tx.ExecContext(ctx,
					"UPDATE Produtos SET quantidade = quantidade - $1 WHERE id = $2 AND tenant_id = $3",
					p.QtdNec * itens[i].Quantidade, p.ProdutoID, tenantID,
				)
				if err != nil {
					return err
				}
			}
		}
	}

	
	if venda.StatusPagamento == "approved" {
		payload := fmt.Sprintf(`{"tipo": "venda_aprovada", "venda_id": %d, "cliente_id": %v}`, venda.ID, ptrToInt(venda.ClienteID))
		_, err = tx.ExecContext(ctx, "INSERT INTO eventos_rpg_outbox (payload) VALUES ($1)", payload)
		if err != nil {
			return err
		}
	}
	
	return tx.Commit()

}

func (r *PdvPgRepository) ObterTotalVendasDinheiro(ctx context.Context, caixaID int) (float64, error) {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return 0, err
	}
	query := `SELECT COALESCE(SUM(valorliquido), 0) FROM Vendas WHERE caixaid = $1 AND metodopagamento = 'Dinheiro' AND tenant_id = $2`
	var total float64
	err = r.db.QueryRowContext(ctx, query, caixaID, tenantID).Scan(&total)
	return total, err
}

func (r *PdvPgRepository) ObterVendaPorGatewayID(ctx context.Context, gatewayID string) (*domain.Venda, error) {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT id, caixa_id, cliente_id, agendamento_id, valor_bruto, desconto, valor_liquido, 
		       metodo_pagamento, status_pagamento, gateway_id, idempotency_key, criado_em
		FROM vendas
		WHERE tenant_id = $1 AND gateway_id = $2
	`
	row := r.db.QueryRowContext(ctx, query, tenantID, gatewayID)

	var v domain.Venda
	err = row.Scan(&v.ID, &v.CaixaID, &v.ClienteID, &v.AgendamentoID, &v.ValorBruto, &v.Desconto,
		&v.ValorLiquido, &v.MetodoPagamento, &v.StatusPagamento, &v.GatewayID, &v.IdempotencyKey, &v.CriadoEm)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &v, nil
}

func (r *PdvPgRepository) AtualizarVenda(ctx context.Context, venda *domain.Venda) error {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		UPDATE vendas
		SET status_pagamento = $1
		WHERE id = $2 AND tenant_id = $3
	`
	_, err = tx.ExecContext(ctx, query, venda.StatusPagamento, venda.ID, tenantID)
	if err != nil {
		return err
	}

	if venda.StatusPagamento == "approved" {
		payload := fmt.Sprintf(`{"tipo": "venda_aprovada", "venda_id": %d, "cliente_id": %v}`, venda.ID, ptrToInt(venda.ClienteID))
		_, err = tx.ExecContext(ctx, "INSERT INTO eventos_rpg_outbox (payload) VALUES ($1)", payload)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func ptrToInt(p *int) interface{} {
	if p == nil {
		return "null"
	}
	return *p
}

