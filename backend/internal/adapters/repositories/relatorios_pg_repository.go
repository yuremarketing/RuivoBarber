package repositories

import (
	"context"
	"database/sql"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/ports"
	"ruivobarber-api/internal/pkg/contextutils"
)

type RelatoriosPgRepository struct {
	db *sql.DB
}

func NewRelatoriosPgRepository(db *sql.DB) ports.RelatoriosRepository {
	return &RelatoriosPgRepository{db: db}
}

func (r *RelatoriosPgRepository) ObterResumoComissoes(ctx context.Context, dataInicio, dataFim string) (*domain.ResumoFinanceiro, error) {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return nil, err
	}

	query := `
		WITH VendasBarbeiro AS (
			SELECT 
				a.BarbeiroID,
				COALESCE(SUM(v.ValorLiquido), 0) as TotalFaturado
			FROM Agendamentos a
			JOIN Vendas v ON v.AgendamentoID = a.ID
			WHERE a.Status = 'Concluido' 
			  AND a.DataHora >= $1::timestamp 
			  AND a.DataHora <= $2::timestamp + interval '1 day' - interval '1 second'
			  AND a.tenant_id = $3
			GROUP BY a.BarbeiroID
		),
		GorjetasBarbeiro AS (
			SELECT 
				BarbeiroID,
				COALESCE(SUM(Valor), 0) as TotalGorjetas
			FROM Gorjetas
			WHERE Status = 'Pago' 
			  AND PagoEm >= $1::timestamp 
			  AND PagoEm <= $2::timestamp + interval '1 day' - interval '1 second'
			  AND tenant_id = $3
			GROUP BY BarbeiroID
		)
		SELECT 
			u.ID as BarbeiroID,
			u.Nome as NomeBarbeiro,
			COALESCE(u.Comissao, 0) as ComissaoPerc,
			COALESCE(vb.TotalFaturado, 0) as TotalFaturado,
			COALESCE(gb.TotalGorjetas, 0) as TotalGorjetas
		FROM Usuarios u
		LEFT JOIN VendasBarbeiro vb ON vb.BarbeiroID = u.ID
		LEFT JOIN GorjetasBarbeiro gb ON gb.BarbeiroID = u.ID
		WHERE u.Cargo = 'Barbeiro' AND u.tenant_id = $3
	`

	rows, err := r.db.QueryContext(ctx, query, dataInicio, dataFim, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var resumo domain.ResumoFinanceiro
	for rows.Next() {
		var rc domain.RelatorioComissao
		if err := rows.Scan(
			&rc.BarbeiroID,
			&rc.NomeBarbeiro,
			&rc.ComissaoPerc,
			&rc.TotalFaturado,
			&rc.TotalGorjetas,
		); err != nil {
			return nil, err
		}

		rc.ValorComissao = (rc.TotalFaturado * rc.ComissaoPerc) / 100.0
		rc.TotalAPagar = rc.ValorComissao + rc.TotalGorjetas

		resumo.ComissoesPorBarbeiro = append(resumo.ComissoesPorBarbeiro, rc)
		resumo.FaturamentoTotal += rc.TotalFaturado
		resumo.ComissoesTotais += rc.ValorComissao
		resumo.GorjetasTotais += rc.TotalGorjetas
	}

	resumo.LucroLiquido = resumo.FaturamentoTotal - resumo.ComissoesTotais

	return &resumo, nil
}
