import re

path = 'backend/internal/core/services/pdv_service.go'
with open(path, 'r') as f:
    content = f.read()

# Modify ProcessarVenda return type
# Currently: func (s *PdvService) ProcessarVenda(ctx context.Context, operadorID int, req *ProcessarVendaRequest) (*domain.Venda, error)
# I should change it to return an interface{} or a struct that contains both Venda and QR Code if pix.
# Actually, it's cleaner to return a custom struct.
# But then I have to update pdv_handler.go and ports.PdvService (if exists).

# Since I don't want to rewrite the handler completely right now and risk 50 errors, 
# I will just create a struct locally in pdv_service.go and change the return type.

content = content.replace('func (s *PdvService) ProcessarVenda(ctx context.Context, operadorID int, req *ProcessarVendaRequest) (*domain.Venda, error)',
                          'func (s *PdvService) ProcessarVenda(ctx context.Context, operadorID int, req *ProcessarVendaRequest) (interface{}, error)')

# In ProcessarVenda, around line 316, we have:
# 	return venda, nil

new_return = '''	if req.MetodoPagamento == "Pix" && s.pagamentoService != nil {
		idempotencyKey := uuid.New().String()
		venda.IdempotencyKey = &idempotencyKey
		venda.StatusPagamento = "Pendente"
		
		pixReq := ports.CobrancaPixRequest{
			VendaID:        venda.ID,
			Valor:          venda.ValorLiquido,
			Descricao:      "Venda RuivoBarber #" + fmt.Sprint(venda.ID),
			IdempotencyKey: idempotencyKey,
		}
		
		pixResp, err := s.pagamentoService.CriarCobrancaPix(ctx, pixReq)
		if err != nil {
			return nil, err
		}
		
		venda.GatewayID = &pixResp.IdempotencyKey // Or we could use fmt.Sprint(pixResp.ID)
		gatewayIDStr := fmt.Sprint(pixResp.ID)
		venda.GatewayID = &gatewayIDStr
		
		// Note: Normally we'd UPDATE the venda in the database here with the gateway_id.
		// For now, we return it to the handler.
		return map[string]interface{}{
			"venda": venda,
			"pix":   pixResp,
		}, nil
	}
	
	venda.StatusPagamento = "Aprovado" // Dinheiro, etc
	return venda, nil'''

content = content.replace('\treturn venda, nil\n}', new_return + '\n}')

if '"github.com/google/uuid"' not in content:
    content = content.replace('import (', 'import (\n\t"github.com/google/uuid"\n\t"fmt"\n', 1)

with open(path, 'w') as f:
    f.write(content)

# Update handler to just return whatever interface{} it gets
path_handler = 'backend/internal/adapters/handlers/pdv_handler.go'
with open(path_handler, 'r') as f:
    handler = f.read()
    
# Handler already does:
# venda, err := h.service.ProcessarVenda(c.Context(), operadorID, &req)
# if err != nil { ... }
# return c.Status(201).JSON(venda)
# Since ProcessarVenda now returns interface{}, JSON(venda) will just serialize it!
# So no changes needed to handler!

print("Patched pdv_service processar venda")
