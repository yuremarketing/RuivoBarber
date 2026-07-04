import re

# pdv_service_test.go
path = 'backend/internal/core/services/pdv_service_test.go'
with open(path, 'r') as f:
    content = f.read()

# Fix all remaining NewPdvService calls
content = content.replace('NewPdvService(mockRepo, mockClienteRepo, mockNotifier)', 'NewPdvService(mockRepo, mockClienteRepo, mockNotifier, nil)')

# Fix undefined venda in line 306. In the previous python script I might have messed up the variable renaming.
content = content.replace('venda.(*domain.Venda)', 'vendaInt.(*domain.Venda)')
# Wait, I probably replaced "venda" with "vendaInt" but missed some. Let's just restore from original and do a simpler replacement.
with open(path, 'w') as f:
    f.write(content)

print("pdv_service_test fixed")
