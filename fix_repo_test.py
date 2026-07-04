path = 'backend/internal/adapters/repositories/cliente_pg_repository_test.go'
with open(path, 'r') as f:
    content = f.read()

if '"context"' not in content:
    content = content.replace('import (', 'import (\n\t"context"\n', 1)

with open(path, 'w') as f:
    f.write(content)
print("Imported context in repo test")
