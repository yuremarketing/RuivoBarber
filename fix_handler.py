import re

path = 'backend/internal/adapters/handlers/pdv_handler.go'
with open(path, 'r') as f:
    content = f.read()

content = re.sub(r'h\.service\.(\w+)\(', r'h.service.\1(c.Context(), ', content)
content = content.replace('c.Context(), )', 'c.Context()')

with open(path, 'w') as f:
    f.write(content)

print("Handler fixed")
