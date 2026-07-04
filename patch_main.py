import re

path = 'backend/cmd/api/main.go'
with open(path, 'r') as f:
    content = f.read()

# Add instantiation of PagamentoService
if 'pagamentoService, err :=' not in content:
    init_pagamento = '''	pagamentoService, err := services.NewMercadoPagoService()
	if err != nil {
		log.Printf("Aviso: Mercado Pago não configurado (%v)", err)
	}

'''
    content = content.replace('pdvService := services.NewPdvService(pdvRepo, clienteRepo, notificationService)', init_pagamento + '\tpdvService := services.NewPdvService(pdvRepo, clienteRepo, notificationService, pagamentoService)')
    
with open(path, 'w') as f:
    f.write(content)

print("Patched main.go")
