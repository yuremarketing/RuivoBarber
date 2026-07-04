import re

path = 'backend/internal/adapters/repositories/pdv_pg_repository.go'
with open(path, 'r') as f:
    content = f.read()

# 1. Update AdicionarVenda
query_venda_old = '''
	queryVenda := `
		INSERT INTO Vendas (caixaid, clienteid, agendamentoid, valorbruto, desconto, valorliquido, metodopagamento, tenant_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, criadoem
	`
	err = tx.QueryRowContext(ctx, queryVenda,
		venda.CaixaID, venda.ClienteID, venda.AgendamentoID,
		venda.ValorBruto, venda.Desconto, venda.ValorLiquido, venda.MetodoPagamento, tenantID,
	).Scan(&venda.ID, &venda.CriadoEm)
'''

query_venda_new = '''
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
'''
content = content.replace(query_venda_old, query_venda_new)

# In AdicionarVenda, add outbox logic before tx.Commit
outbox_logic_add = '''
	if venda.StatusPagamento == "approved" {
		payload := fmt.Sprintf(`{"tipo": "venda_aprovada", "venda_id": %d, "cliente_id": %v}`, venda.ID, ptrToInt(venda.ClienteID))
		_, err = tx.ExecContext(ctx, "INSERT INTO eventos_rpg_outbox (payload) VALUES ($1)", payload)
		if err != nil {
			return err
		}
	}
	
	return tx.Commit()
'''
content = content.replace('return tx.Commit()', outbox_logic_add)


# 2. Update AtualizarVenda
atualizar_venda_old = '''func (r *PdvPgRepository) AtualizarVenda(ctx context.Context, venda *domain.Venda) error {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return err
	}

	query := `
		UPDATE vendas
		SET status_pagamento = $1
		WHERE id = $2 AND tenant_id = $3
	`
	_, err = r.db.ExecContext(ctx, query, venda.StatusPagamento, venda.ID, tenantID)
	return err
}'''

atualizar_venda_new = '''func (r *PdvPgRepository) AtualizarVenda(ctx context.Context, venda *domain.Venda) error {
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
'''
content = content.replace(atualizar_venda_old, atualizar_venda_new)

if '"fmt"' not in content:
    content = content.replace('import (', 'import (\n\t"fmt"\n', 1)

with open(path, 'w') as f:
    f.write(content)

print("Outbox implemented in repo")
