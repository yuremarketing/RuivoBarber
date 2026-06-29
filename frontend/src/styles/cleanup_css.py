import os
import re

css_files = [f for f in os.listdir('.') if f.endswith('.css') and f != 'base.css']

replacements = {
    r'rgba\(249,\s*115,\s*22,\s*0\.15\)': 'var(--accent-15)',
    r'rgba\(59,\s*130,\s*246,\s*0\.15\)': 'var(--accent-15)', # Using accent for blue badges
    r'rgba\(34,\s*197,\s*94,\s*0\.15\)': 'var(--accent-15)', # Using accent for green badges
    r'rgba\(239,\s*68,\s*68,\s*0\.15\)': 'var(--accent-15)', # Using accent for red badges
    # Since these were specifically colored badges, maybe they shouldn't just be accent.
    # Actually, they are using rgba with specific colors. It's better to replace them with var(--color-15) if we add them to base.css.
}

# Actually, the user asked to map hardcoded colors to global theme variables in .css
# Let's map specific hex codes that match our base.css variables.
hex_map = {
    '#0a0d13': 'var(--bg-body)',
    '#0f121a': 'var(--bg-sidebar)',
    '#161a24': 'var(--bg-card)',
    '#1f2430': 'var(--bg-card-hover)',
    '#090c12': 'var(--bg-input)',
    '#2ecc71': 'var(--green)',
    '#3498db': 'var(--blue)',
    '#ff6b6b': 'var(--red)',
    '#e67e22': 'var(--orange)',
    '#f0f0f5': 'var(--text-primary)',
    '#9ba8b8': 'var(--text-secondary)',
    '#7383a1': 'var(--text-muted)',
    '#2b3240': 'var(--border)',
    '#a38c5d': 'var(--border-gold)',
    # some specific ones found in rpg.css
    '#b026ff': 'var(--accent)', # Assuming royal purple is accent
    '#f5a623': 'var(--gold)',
    '#00f2fe': 'var(--blue)',
}

def replace_hex(content):
    for hex_code, var_name in hex_map.items():
        # Case insensitive replace for hex codes
        content = re.sub(hex_code, var_name, content, flags=re.IGNORECASE)
    return content

for file in css_files:
    with open(file, 'r') as f:
        content = f.read()
    
    new_content = replace_hex(content)
    
    if new_content != content:
        with open(file, 'w') as f:
            f.write(new_content)
        print(f"Updated {file}")
    else:
        print(f"No changes for {file}")
