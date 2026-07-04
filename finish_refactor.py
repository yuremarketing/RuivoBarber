import re
import os

def update_ports():
    path = 'backend/internal/core/ports/cliente_repository.go'
    with open(path, 'r') as f:
        content = f.read()
    
    # Add ctx context.Context to any method that doesn't have it yet
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if '(' in line and ')' in line and 'context.Context' not in line and 'type' not in line and 'import' not in line and 'package' not in line:
            lines[i] = re.sub(r'(\w+)\((.*?)\)', r'\1(ctx context.Context, \2)', line)
            lines[i] = lines[i].replace('(ctx context.Context, )', '(ctx context.Context)')
    
    with open(path, 'w') as f:
        f.write('\n'.join(lines))

def update_repo():
    path = 'backend/internal/adapters/repositories/cliente_pg_repository.go'
    with open(path, 'r') as f:
        content = f.read()
    
    # Add ctx context.Context to any func (r *ClientePgRepository) that doesn't have it
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('func (r *ClientePgRepository)') and 'context.Context' not in line:
            lines[i] = re.sub(r'func \(r \*ClientePgRepository\) (\w+)\((.*?)\)', r'func (r *ClientePgRepository) \1(ctx context.Context, \2)', line)
            lines[i] = lines[i].replace('(ctx context.Context, )', '(ctx context.Context)')
    
    with open(path, 'w') as f:
        f.write('\n'.join(lines))

def fix_all_services():
    services_dir = 'backend/internal/core/services'
    for file in os.listdir(services_dir):
        if file.endswith('.go'):
            path = os.path.join(services_dir, file)
            with open(path, 'r') as f:
                content = f.read()
            
            original = content
            # Add context.Background() to any s.clienteRepo call that lacks ctx
            # This is a bit tricky, we just blindly add context.Background() if not present
            content = re.sub(r's\.clienteRepo\.(\w+)\(', r's.clienteRepo.\1(context.Background(), ', content)
            content = content.replace('(context.Background(), ctx,', '(ctx,')
            content = content.replace('(context.Background(), context.Background(),', '(context.Background(),')
            content = content.replace('(context.Background(), )', '(context.Background())')
            
            if content != original and '"context"' not in content:
                content = content.replace('import (', 'import (\n\t"context"\n', 1)
                
            with open(path, 'w') as f:
                f.write(content)

update_ports()
update_repo()
fix_all_services()
print("Refactoring applied to ports, repo, and services.")
