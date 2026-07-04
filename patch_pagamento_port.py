import re

path = 'backend/internal/core/ports/pagamento_service.go'
with open(path, 'r') as f:
    content = f.read()

content = content.replace('CriarCobrancaPix(ctx context.Context, req CobrancaPixRequest) (*PixCobranzaResponse, error)',
                          'CriarCobrancaPix(ctx context.Context, req CobrancaPixRequest) (*PixCobranzaResponse, error)\n\tConsultarPagamento(ctx context.Context, paymentID int64) (*PixCobranzaResponse, error)')

with open(path, 'w') as f:
    f.write(content)

path2 = 'backend/internal/core/services/pagamento_service.go'
with open(path2, 'r') as f:
    content2 = f.read()

get_method = '''
func (s *MercadoPagoService) ConsultarPagamento(ctx context.Context, paymentID int64) (*ports.PixCobranzaResponse, error) {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	response, err := s.client.Get(ctxWithTimeout, int(paymentID))
	if err != nil {
		return nil, fmt.Errorf("falha ao consultar pagamento no Mercado Pago: %w", err)
	}

	if response == nil {
		return nil, errors.New("resposta vazia do Mercado Pago")
	}

	var qrCode string
	if response.PointOfInteraction != nil && response.PointOfInteraction.TransactionData != nil {
		qrCode = response.PointOfInteraction.TransactionData.QRCodeBase64
	}

	var idempotency string
	// Mercado Pago SDK doesn't always expose idempotency key in GET response directly if we didn't pass it in metadata.
	// We'll rely on the status and the GatewayID we saved.

	return &ports.PixCobranzaResponse{
		ID:             int64(response.ID),
		Status:         response.Status,
		Valor:          response.TransactionAmount,
		QRCodeBase64:   qrCode,
		IdempotencyKey: idempotency,
	}, nil
}
'''
content2 = content2 + get_method

with open(path2, 'w') as f:
    f.write(content2)

print("Pagamento port and service patched")
