import re

path = 'backend/cmd/api/main.go'
with open(path, 'r') as f:
    content = f.read()

# Find handler instantiations
if 'webhookHandler :=' not in content:
    init_webhook = '	webhookHandler := handlers.NewWebhookHandler(pdvService)\n'
    content = content.replace('	pdvHandler := handlers.NewPdvHandler(pdvService)', '	pdvHandler := handlers.NewPdvHandler(pdvService)\n' + init_webhook)

# Find route registrations
if '/api/v1/webhooks/mercadopago' not in content:
    route = '\n\t// Webhooks\n\tapp.Post("/api/v1/webhooks/mercadopago", webhookHandler.HandleMercadoPago)\n'
    # Insert before first pdv route
    content = content.replace('	app.Post("/api/v1/pdv/caixa/abrir"', route + '	app.Post("/api/v1/pdv/caixa/abrir"')

with open(path, 'w') as f:
    f.write(content)

print("Main patched for webhooks")
