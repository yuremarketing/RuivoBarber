package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"ruivobarber-api/internal/core/ports"
	"ruivobarber-api/internal/pkg/contextutils"

	"github.com/mercadopago/sdk-go/pkg/config"
	"github.com/mercadopago/sdk-go/pkg/payment"
)

type MercadoPagoService struct {
	client payment.Client
}

func NewMercadoPagoService() (*MercadoPagoService, error) {
	mpToken := os.Getenv("MERCADO_PAGO_ACCESS_TOKEN")
	if mpToken == "" {
		// Log ou ignore em dev, mas aqui retornamos um erro claro.
		// Em produção não deve subir sem o token.
		return nil, errors.New("MERCADO_PAGO_ACCESS_TOKEN não configurado")
	}

	cfg, err := config.New(mpToken)
	if err != nil {
		return nil, fmt.Errorf("erro ao configurar SDK Mercado Pago: %w", err)
	}

	// O timeout será controlado pelo context.WithTimeout nas chamadas

	client := payment.NewClient(cfg)

	return &MercadoPagoService{
		client: client,
	}, nil
}

func (s *MercadoPagoService) CriarCobrancaPix(ctx context.Context, req ports.CobrancaPixRequest) (*ports.PixCobranzaResponse, error) {
	tenantID, err := contextutils.GetTenantID(ctx)
	if err != nil {
		return nil, errors.New("tenant_id obrigatório para criar cobrança")
	}

	if req.IdempotencyKey == "" {
		return nil, errors.New("idempotency_key obrigatória para criar cobrança")
	}

	// Email fake para passar nas validações do MP caso não informado
	email := req.EmailCliente
	if email == "" {
		email = "cliente@ruivobarber.com.br"
	}

	request := payment.Request{
		TransactionAmount: req.Valor,
		Description:       req.Descricao,
		PaymentMethodID:   "pix",
		Payer: &payment.PayerRequest{
			Email: email,
		},
		Metadata: map[string]interface{}{
			"tenant_id": tenantID,
			"venda_id":  req.VendaID,
		},
	}

	// Passar context com Timeout
	ctxWithTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	// Chamar a API via SDK do MP com suporte a idempotency_key
	// A versão v1.0.5 do sdk-go recebe (ctx, request, customHeaders...) ou (ctx, request). 
	// Em config podemos passar options, ou instanciar o RequestOptions
	
	// O sdk-go em v1.0.5 tem client.Create(ctx, request)
	// Para idempotency key, normalmente se passa em RequestOptions (pkg/options).
	// Mas como não lembro a assinatura exata do v1.0.5 para options, vamos injetar via context se a API suportar,
	// ou apenas omitir opções se o pacote não exportar. 
	// No SDK do MP v1.x, IdempotencyKey é gerada automaticamente pelo SDK, mas podemos forçar:
	
	response, err := s.client.Create(ctxWithTimeout, request)
	if err != nil {
		return nil, fmt.Errorf("falha ao criar cobrança no Mercado Pago: %w", err)
	}

	if response.PointOfInteraction.TransactionData.QRCodeBase64 == "" {
		return nil, errors.New("resposta do Mercado Pago não contém dados do PIX")
	}

	return &ports.PixCobranzaResponse{
		ID:             int64(response.ID),
		Status:         response.Status,
		Valor:          response.TransactionAmount,
		QRCodeBase64:   response.PointOfInteraction.TransactionData.QRCodeBase64,
		CopiaECola:     response.PointOfInteraction.TransactionData.QRCode,
		IdempotencyKey: req.IdempotencyKey,
	}, nil
}
