import re

path = 'backend/internal/core/services/pdv_service_test.go'
with open(path, 'r') as f:
    content = f.read()

# Fix NewPdvService calls again
content = content.replace('NewPdvService(mockRepo, mockClienteRepo, mockNotifier)', 'NewPdvService(mockRepo, mockClienteRepo, mockNotifier, nil)')

# Fix casting for tests that expect *domain.Venda
content = content.replace('venda.ValorBruto', 'venda.(*domain.Venda).ValorBruto')
content = content.replace('venda.ValorLiquido', 'venda.(*domain.Venda).ValorLiquido')
content = content.replace('vendaCli.ClienteID', 'vendaCli.(*domain.Venda).ClienteID')
content = content.replace('venda, err := service.ProcessarVenda', 'vendaInt, err := service.ProcessarVenda')
content = content.replace('venda != nil', 'vendaInt != nil')
content = content.replace('venda.(*domain.Venda)', 'vendaInt.(*domain.Venda)')
# The regex above will rename venda to vendaInt, and then cast it.
# Wait, let's just do a simpler replacement for the assertion parts.

# Actually, I'll just restore the file and patch it cleanly:
with open(path, 'w') as f:
    f.write(content)

print("Tests patched again")
