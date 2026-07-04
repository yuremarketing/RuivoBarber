import re
import os

path = 'backend/internal/core/services/cliente_service.go'
with open(path, 'r') as f:
    content = f.read()

# For specific repository methods that were changed (FindAll, FindByID, FindByLogin, GetPasswordHashByLogin, Save)
# We need to inject ctx. However, the service methods don't have ctx yet in most cases!
# Since the goal is just to compile the first part to get the build green, 
# and passing context.Background() is technically valid Go code, I will use context.Background() in cliente_service.go where ctx is not available in signature.

content = re.sub(r's\.repo\.FindAll\(\)', r's.repo.FindAll(context.Background())', content)
content = re.sub(r's\.repo\.FindByID\(([^)]+)\)', r's.repo.FindByID(context.Background(), \1)', content)
content = re.sub(r's\.repo\.FindByLogin\(([^)]+)\)', r's.repo.FindByLogin(context.Background(), \1)', content)
content = re.sub(r's\.repo\.GetPasswordHashByLogin\(([^)]+)\)', r's.repo.GetPasswordHashByLogin(context.Background(), \1)', content)
content = re.sub(r's\.repo\.Save\(([^,]+),([^)]+)\)', r's.repo.Save(context.Background(), \1, \2)', content)

# Ensure context is imported
if '"context"' not in content:
    content = content.replace('import (', 'import (\n\t"context"\n', 1)

with open(path, 'w') as f:
    f.write(content)

print("Service patched")
