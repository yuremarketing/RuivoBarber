import re
import sys

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replacements for DashboardPage.jsx
    # style={{ maxWidth: '1200px', margin: '0 auto' }} -> className="page-container"
    content = re.sub(
        r'className="([^"]+)" style=\{\{\s*maxWidth:\s*\'1200px\',\s*margin:\s*\'0 auto\'\s*\}\}',
        r'className="\1 page-container"',
        content
    )
    content = re.sub(
        r'style=\{\{\s*maxWidth:\s*\'1200px\',\s*margin:\s*\'0 auto\'\s*\}\}',
        r'className="page-container"',
        content
    )

    # style={{ maxWidth: '1200px', margin: '2.5rem auto', padding: '1rem' }} -> className="page-container padded"
    content = re.sub(
        r'className="([^"]+)" style=\{\{\s*maxWidth:\s*\'1200px\',\s*margin:\s*\'2.5rem auto\',\s*padding:\s*\'1rem\'\s*\}\}',
        r'className="\1 page-container padded"',
        content
    )
    content = re.sub(
        r'style=\{\{\s*maxWidth:\s*\'1200px\',\s*margin:\s*\'2.5rem auto\',\s*padding:\s*\'1rem\'\s*\}\}',
        r'className="page-container padded"',
        content
    )
    
    # style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }} -> className="page-container"
    content = re.sub(
        r'className="([^"]+)" style=\{\{\s*maxWidth:\s*\'1200px\',\s*margin:\s*\'0 auto\',\s*padding:\s*\'0 1rem\'\s*\}\}',
        r'className="\1 page-container"',
        content
    )
    content = re.sub(
        r'style=\{\{\s*maxWidth:\s*\'1200px\',\s*margin:\s*\'0 auto\',\s*padding:\s*\'0 1rem\'\s*\}\}',
        r'className="page-container"',
        content
    )

    # Error box
    content = re.sub(
        r'style=\{\{\s*padding:\s*\'0.75rem\',\s*marginBottom:\s*\'1.5rem\',\s*borderRadius:\s*\'6px\',\s*background:\s*\'rgba\(233, 69, 96, 0.15\)\',\s*border:\s*\'1px solid #e94560\',\s*color:\s*\'#ff8a8a\',\s*fontSize:\s*\'0.9rem\'\s*\}\}',
        r'className="alert-error mb-1"',
        content
    )
    
    # style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
    content = re.sub(
        r'style=\{\{\s*display:\s*\'flex\',\s*alignItems:\s*\'center\',\s*gap:\s*\'1rem\'\s*\}\}',
        r'className="flex-center gap-1"',
        content
    )

    # style={{ marginTop: '2.5rem' }} -> className="mt-3"
    content = re.sub(
        r'className="([^"]+)" style=\{\{\s*marginTop:\s*\'2.5rem\'\s*\}\}',
        r'className="\1 mt-3"',
        content
    )
    content = re.sub(
        r'style=\{\{\s*marginTop:\s*\'2.5rem\'\s*\}\}',
        r'className="mt-3"',
        content
    )

    # style={{ flexDirection: 'column', gap: '0', alignItems: 'center' }}
    content = re.sub(
        r'className="([^"]+)" style=\{\{\s*flexDirection:\s*\'column\',\s*gap:\s*\'0\',\s*alignItems:\s*\'center\'\s*\}\}',
        r'className="\1 flex-column flex-center gap-0"',
        content
    )
    
    with open(filepath, 'w') as f:
        f.write(content)

process_file('/home/mark/Dev/ruivobarber/frontend/src/pages/DashboardPage.jsx')
