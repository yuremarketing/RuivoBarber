import os
import re

directories = [
    '/home/mark/Dev/ruivobarber/frontend/src/pages',
    '/home/mark/Dev/ruivobarber/frontend/src/components'
]

# A list of tuples: (regex_pattern, class_name)
# We will look for elements that might or might not have a className.
# If they have className="xxx", we append to it.
# If they don't, we add className="xxx".
# To keep it simple, we'll just replace the style={{...}} with className="xxx" if there is no className,
# or we'll have to parse it.

# Actually, the safest way for bulk regex in JSX:
# Pattern: (className="([^"]*)")?\s*style=\{\{\s*([^}]+)\s*\}\}
# We only want to replace specific known style strings, to not mess up dynamic styles.
# Or we can do exact string replacements!

replacements = {
    # Flex & Layout
    r"style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*'1\.5rem',\s*width:\s*'100%'\s*\}\}": "className=\"flex-column w-full gap-1-5\"",
    r"style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*'0\.75rem'\s*\}\}": "className=\"flex-column gap-0-75\"",
    r"style=\{\{\s*display:\s*'flex',\s*gap:\s*'0\.5rem'\s*\}\}": "className=\"flex-row gap-0-5\"",
    r"style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*alignItems:\s*'center',\s*gap:\s*'1rem',\s*padding:\s*'2rem 0',\s*textAlign:\s*'center'\s*\}\}": "className=\"flex-column flex-align-center gap-1 py-2 text-center\"",
    r"style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*gap:\s*'1\.25rem',\s*padding:\s*'0\.5rem 0'\s*\}\}": "className=\"flex-column gap-1-25 py-0-5\"",
    r"style=\{\{\s*display:\s*'flex',\s*flexDirection:\s*'column',\s*alignItems:\s*'center',\s*gap:\s*'0\.5rem'\s*\}\}": "className=\"flex-column flex-align-center gap-0-5\"",

    # Margins & Paddings
    r"style=\{\{\s*marginBottom:\s*'1rem'\s*\}\}": "className=\"mb-1\"",
    r"style=\{\{\s*marginBottom:\s*'0\.5rem'\s*\}\}": "className=\"mb-0-5\"",
    r"style=\{\{\s*paddingBottom:\s*'0\.75rem',\s*marginBottom:\s*'1rem'\s*\}\}": "className=\"pb-0-75 mb-1\"",
    r"style=\{\{\s*marginTop:\s*'1rem'\s*\}\}": "className=\"mt-1\"",
    r"style=\{\{\s*margin:\s*0\s*\}\}": "className=\"m-0\"",

    # Colors
    r"style=\{\{\s*color:\s*'var\(--accent\)'\s*\}\}": "className=\"text-accent\"",
    r"style=\{\{\s*color:\s*'var\(--text-secondary\)',\s*fontSize:\s*'0\.85rem'\s*\}\}": "className=\"text-secondary text-sm\"",
    r"style=\{\{\s*color:\s*'var\(--gold\)',\s*fontWeight:\s*700\s*\}\}": "className=\"text-gold font-bold\"",

    # Borders & Misc
    r"style=\{\{\s*border:\s*'1px solid var\(--border\)'\s*\}\}": "className=\"border-standard\"",
    r"style=\{\{\s*fontSize:\s*'0\.75rem'\s*\}\}": "className=\"text-xs\"",
    r"style=\{\{\s*fontSize:\s*'0\.82rem'\s*\}\}": "className=\"text-sm\"",
    r"style=\{\{\s*fontWeight:\s*600\s*\}\}": "className=\"font-semibold\"",
    r"style=\{\{\s*maxWidth:\s*'440px',\s*width:\s*'100%'\s*\}\}": "className=\"w-full max-w-440\"",
    r"style=\{\{\s*borderBottom:\s*'1px solid var\(--border\)',\s*paddingBottom:\s*'0\.75rem',\s*textAlign:\s*'left'\s*\}\}": "className=\"border-b pb-0-75 text-left\"",
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    # First, handle elements that ALREADY have a className and we're adding another className="" string.
    # We will do a generic merge pass after replacing exact strings.
    # But wait, the replacement output is className="...", which would cause className="..." className="..."
    # We'll fix that.
    
    for pattern, replacement in replacements.items():
        new_content = re.sub(pattern, replacement, new_content)
        
    # Fix double classNames: className="foo" className="bar" -> className="foo bar"
    # We do this repeatedly until no more matches
    while True:
        # Match className="something" optionally spaces className="something_else"
        merged = re.sub(r'className="([^"]+)"\s+className="([^"]+)"', r'className="\1 \2"', new_content)
        if merged == new_content:
            break
        new_content = merged
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

for d in directories:
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.jsx'):
                process_file(os.path.join(root, file))

print("Done")
