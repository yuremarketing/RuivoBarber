import re

# 1. cliente_pg_repository_test.go
path = 'backend/internal/adapters/repositories/cliente_pg_repository_test.go'
with open(path, 'r') as f:
    content = f.read()

content = re.sub(r'repo\.CriarAgendamento\(([^c])', r'repo.CriarAgendamento(context.Background(), \1', content)
with open(path, 'w') as f:
    f.write(content)


# 2. cliente_service_test.go
path = 'backend/internal/core/services/cliente_service_test.go'
with open(path, 'r') as f:
    content = f.read()

# Mock definitions
content = re.sub(r'func \(m \*mockClienteRepository\) (\w+)\((.*?)\)', r'func (m *mockClienteRepository) \1(ctx context.Context, \2)', content)
content = content.replace('(ctx context.Context, )', '(ctx context.Context)')

if '"context"' not in content:
    content = content.replace('import (', 'import (\n\t"context"\n', 1)

with open(path, 'w') as f:
    f.write(content)


# 3. pdv_service_test.go
path = 'backend/internal/core/services/pdv_service_test.go'
with open(path, 'r') as f:
    content = f.read()

# Update mock definitions
content = re.sub(r'func \(m \*mockPdvRepository\) (\w+)\((.*?)\)', r'func (m *mockPdvRepository) \1(ctx context.Context, \2)', content)
content = content.replace('(ctx context.Context, )', '(ctx context.Context)')

content = re.sub(r'func \(m \*mockPdvClienteRepository\) (\w+)\((.*?)\)', r'func (m *mockPdvClienteRepository) \1(ctx context.Context, \2)', content)
content = content.replace('(ctx context.Context, )', '(ctx context.Context)')

# Update NewPdvService calls
content = content.replace('NewPdvService(mockRepo, mockClienteRepo, mockNotifier)', 'NewPdvService(mockRepo, mockClienteRepo, mockNotifier, nil)')

# Update service calls to pass context
content = re.sub(r'service\.(\w+)\(', r'service.\1(context.Background(), ', content)
content = content.replace('(context.Background(), ctx,', '(ctx,')
content = content.replace('(context.Background(), context.Background(),', '(context.Background(),')
content = content.replace('(context.Background(), )', '(context.Background())')
# Revert NewPdvService since it's not a service method call in that sense
content = content.replace('service.NewPdvService(context.Background(),', 'services.NewPdvService(') 
# Wait, the call is literally NewPdvService(...) inside tests without package prefix if it's the same package.
# Actually, the python regex matched `service.(\w+)(`. If `service` is the variable name of PdvService instance, then it works.

if '"context"' not in content:
    content = content.replace('import (', 'import (\n\t"context"\n', 1)

with open(path, 'w') as f:
    f.write(content)

print("Tests patched")
