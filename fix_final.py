import re

def fix_repo():
    path = 'backend/internal/adapters/repositories/cliente_pg_repository.go'
    with open(path, 'r') as f:
        content = f.read()
    
    # Remove ctx := context.Background() inside methods that now receive ctx
    content = re.sub(r'(\s+)ctx := context\.Background\(\)', r'', content)
    
    with open(path, 'w') as f:
        f.write(content)

def fix_cliente_service():
    path = 'backend/internal/core/services/cliente_service.go'
    with open(path, 'r') as f:
        content = f.read()
    
    # Inject context.Background() in s.repo calls that lack it
    # First, undo the ones I manually did in the previous script that now might be messed up
    # Actually, it's safer to just blindly add it and then fix duplicates
    content = re.sub(r's\.repo\.(\w+)\(', r's.repo.\1(context.Background(), ', content)
    
    # Fix duplicates
    content = content.replace('(context.Background(), ctx,', '(ctx,')
    content = content.replace('(context.Background(), context.Background(),', '(context.Background(),')
    content = content.replace('(context.Background(), )', '(context.Background())')
    
    with open(path, 'w') as f:
        f.write(content)

fix_repo()
fix_cliente_service()
print("Final fixes applied")
