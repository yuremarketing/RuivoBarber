package ports

import (
	"context"
)

type PixCobranzaResponse struct {
	ID             int64   `json:"id"`
	Status         string  `json:"status"`
	Valor          float64 `json:"valor"`
	QRCodeBase64   string  `json:"qr_code_base64"`
	CopiaECola     string  `json:"copia_e_cola"`
	IdempotencyKey string  `json:"idempotency_key"`
}

type CobrancaPixRequest struct {
	VendaID        int     `json:"venda_id"`
	Valor          float64 `json:"valor"`
	Descricao      string  `json:"descricao"`
	EmailCliente   string  `json:"email_cliente"`
	IdempotencyKey string  `json:"idempotency_key"` // Necessário para evitar cobranças duplicadas
}

type PagamentoService interface {
	CriarCobrancaPix(ctx context.Context, req CobrancaPixRequest) (*PixCobranzaResponse, error)
	ConsultarPagamento(ctx context.Context, paymentID int64) (*PixCobranzaResponse, error)
}
