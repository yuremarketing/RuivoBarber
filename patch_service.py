import re

path = 'backend/internal/core/services/pdv_service.go'
with open(path, 'r') as f:
    content = f.read()

new_service_method = '''
func (s *PdvService) ProcessarWebhookPix(ctx context.Context, paymentID int64) error {
	if s.pagamentoService == nil {
		return errors.New("serviço de pagamentos não configurado")
	}

	pixResp, err := s.pagamentoService.ConsultarPagamento(ctx, paymentID)
	if err != nil {
		return fmt.Errorf("erro ao consultar MP: %w", err)
	}

	gatewayIDStr := fmt.Sprint(pixResp.ID)
	
	// Transactional/safe update: We get the Venda by GatewayID
	venda, err := s.repo.ObterVendaPorGatewayID(ctx, gatewayIDStr)
	if err != nil {
		return fmt.Errorf("erro ao obter venda: %w", err)
	}
	if venda == nil {
		return errors.New("venda não encontrada para este pagamento")
	}

	// Idempotency: if already approved, do nothing
	if venda.StatusPagamento == "Aprovado" {
		return nil
	}
	
	// Validate value (optional strictness, but requested by user)
	// We ignore small differences or just strictly check
	if pixResp.Valor < venda.ValorLiquido {
		return errors.New("valor pago é menor que o valor líquido da venda")
	}

	if pixResp.Status == "approved" {
		venda.StatusPagamento = "Aprovado"
		err = s.repo.AtualizarVenda(ctx, venda)
		if err != nil {
			return fmt.Errorf("erro ao atualizar venda: %w", err)
		}
		
		// Concluir agendamento if present
		if venda.AgendamentoID != nil {
			ag, err := s.clienteRepo.ObterAgendamentoPorID(ctx, *venda.AgendamentoID)
			if err == nil && ag != nil && ag.Status != "Concluido" {
				event, _ := s.clienteRepo.ConcluirAtendimento(ctx, *venda.AgendamentoID)
				if event != nil {
					s.notifier.EnqueueNotification(*event)
				}
			}
		}
	} else if pixResp.Status == "rejected" || pixResp.Status == "cancelled" {
		venda.StatusPagamento = "Cancelado"
		_ = s.repo.AtualizarVenda(ctx, venda)
	}

	return nil
}
'''

content = content + new_service_method

with open(path, 'w') as f:
    f.write(content)

print("PdvService patched with webhook processor")
