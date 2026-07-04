import re
import os

def update_file(path):
    if not os.path.exists(path):
        return
    with open(path, 'r') as f:
        content = f.read()
    
    content = content.replace('"Pendente"', '"pending"')
    content = content.replace('"Aprovado"', '"approved"')
    content = content.replace('"Cancelado"', '"cancelled"')
    
    with open(path, 'w') as f:
        f.write(content)

update_file('backend/internal/core/services/pdv_service_test.go')
update_file('backend/internal/adapters/repositories/pdv_pg_repository_test.go')
update_file('backend/internal/adapters/repositories/cliente_pg_repository_test.go')

print("Tests patched for FSM strings")
