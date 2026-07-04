import re

path = 'backend/internal/core/services/pdv_service.go'
with open(path, 'r') as f:
    content = f.read()

# Add pagamentoService to struct
content = re.sub(r'type PdvService struct {\n\trepo\s+ports\.PdvRepository\n\tclienteRepo\s+ports\.ClienteRepository\n\tnotifier\s+ports\.NotificationService\n}', 
                 'type PdvService struct {\n\trepo        ports.PdvRepository\n\tclienteRepo ports.ClienteRepository\n\tnotifier    ports.NotificationService\n\tpagamentoService ports.PagamentoService\n}', content)

# Update constructor
content = re.sub(r'func NewPdvService\(repo ports\.PdvRepository, clienteRepo ports\.ClienteRepository, notifier ports\.NotificationService\) \*PdvService {',
                 'func NewPdvService(repo ports.PdvRepository, clienteRepo ports.ClienteRepository, notifier ports.NotificationService, pagamentoService ports.PagamentoService) *PdvService {', content)
content = re.sub(r'notifier:\s+notifier,\n\t}', r'notifier:    notifier,\n\t\tpagamentoService: pagamentoService,\n\t}', content)

with open(path, 'w') as f:
    f.write(content)

print("Patched PdvService struct")
