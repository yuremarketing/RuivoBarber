import re

path_port = 'backend/internal/core/ports/pdv_repository.go'
with open(path_port, 'r') as f:
    content = f.read()

new_methods = '''	AdicionarVenda(ctx context.Context, venda *domain.Venda, itens []domain.VendaItem) error
	ObterTotalVendasDinheiro(ctx context.Context, caixaID int) (float64, error)
	ObterVendaPorGatewayID(ctx context.Context, gatewayID string) (*domain.Venda, error)
	AtualizarVenda(ctx context.Context, venda *domain.Venda) error'''

content = content.replace('	AdicionarVenda(ctx context.Context, venda *domain.Venda, itens []domain.VendaItem) error\n\tObterTotalVendasDinheiro(ctx context.Context, caixaID int) (float64, error)', new_methods)

with open(path_port, 'w') as f:
    f.write(content)

path_pg = 'backend/internal/adapters/repositories/pdv_pg_repository.go'
with open(path_pg, 'r') as f:
    content2 = f.read()

new_pg_methods = '''
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

	query := `
		UPDATE vendas
		SET status_pagamento = $1
		WHERE id = $2 AND tenant_id = $3
	`
	_, err = r.db.ExecContext(ctx, query, venda.StatusPagamento, venda.ID, tenantID)
	return err
}
'''
content2 = content2 + new_pg_methods

if '"database/sql"' not in content2:
    content2 = content2.replace('import (', 'import (\n\t"database/sql"\n', 1)

with open(path_pg, 'w') as f:
    f.write(content2)

print("Repo patched")
