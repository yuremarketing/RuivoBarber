package domain

type RelatorioComissao struct {
	BarbeiroID     int     `json:"barbeiro_id"`
	NomeBarbeiro   string  `json:"nome_barbeiro"`
	ComissaoPerc   float64 `json:"comissao_perc"`
	TotalFaturado  float64 `json:"total_faturado"`
	ValorComissao  float64 `json:"valor_comissao"`
	TotalGorjetas  float64 `json:"total_gorjetas"`
	TotalAPagar    float64 `json:"total_a_pagar"`
}

type ResumoFinanceiro struct {
	FaturamentoTotal     float64             `json:"faturamento_total"`
	ComissoesTotais      float64             `json:"comissoes_totais"`
	GorjetasTotais       float64             `json:"gorjetas_totais"`
	LucroLiquido         float64             `json:"lucro_liquido"` // FaturamentoTotal - ComissoesTotais
	ComissoesPorBarbeiro []RelatorioComissao `json:"comissoes_por_barbeiro"`
}
