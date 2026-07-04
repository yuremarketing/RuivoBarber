package domain

import "time"

type Venda struct {
	ID              int       `json:"id"`
	CaixaID         int       `json:"caixa_id"`
	ClienteID       *int      `json:"cliente_id"`
	AgendamentoID   *int      `json:"agendamento_id"`
	ValorBruto      float64   `json:"valor_bruto"`
	Desconto        float64   `json:"desconto"`
	ValorLiquido    float64   `json:"valor_liquido"`
	MetodoPagamento string    `json:"metodo_pagamento"`
	StatusPagamento string    `json:"status_pagamento"`
	GatewayID       *string   `json:"gateway_id"`
	IdempotencyKey  *string   `json:"idempotency_key"`
	CriadoEm        time.Time `json:"criado_em"`
}

type VendaItem struct {
	ID            int     `json:"id"`
	VendaID       int     `json:"venda_id"`
	ServicoID     *int    `json:"servico_id"`
	PrecoUnitario float64 `json:"preco_unitario"`
	Quantidade    int     `json:"quantidade"`
}
