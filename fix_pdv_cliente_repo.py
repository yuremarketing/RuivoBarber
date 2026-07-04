import re

path = 'backend/internal/core/services/pdv_service.go'
with open(path, 'r') as f:
    content = f.read()

content = re.sub(r's\.clienteRepo\.(\w+)\(', r's.clienteRepo.\1(ctx, ', content)
content = content.replace('ctx, )', 'ctx)')

with open(path, 'w') as f:
    f.write(content)

print("Fixed pdv service cliente repo calls")
