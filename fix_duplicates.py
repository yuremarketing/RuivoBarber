import re

path = 'backend/internal/core/services/cliente_service.go'
with open(path, 'r') as f:
    content = f.read()

content = content.replace('s.repo.FindAll(context.Background(), context.Background())', 's.repo.FindAll(context.Background())')
content = content.replace('s.repo.FindAll(context.Background(), ctx)', 's.repo.FindAll(ctx)')
content = content.replace('s.repo.FindAll(ctx, context.Background())', 's.repo.FindAll(ctx)')

with open(path, 'w') as f:
    f.write(content)

print("Duplicates fixed")
