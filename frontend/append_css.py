import os

css_content = """
/* ── Auto-generated Utility Classes ─── */
.flex-row { display: flex; flex-direction: row; }
.gap-1-5 { gap: 1.5rem; }
.gap-1-25 { gap: 1.25rem; }
.gap-0-75 { gap: 0.75rem; }
.gap-0-5 { gap: 0.5rem; }
.flex-align-center { align-items: center; }
.py-2 { padding-top: 2rem; padding-bottom: 2rem; }
.py-0-5 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.mb-0-5 { margin-bottom: 0.5rem; }
.pb-0-75 { padding-bottom: 0.75rem; }
.m-0 { margin: 0; }
.text-accent { color: var(--accent); }
.text-secondary { color: var(--text-secondary); }
.text-gold { color: var(--gold); }
.text-sm { font-size: 0.85rem; }
.text-xs { font-size: 0.75rem; }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.border-standard { border: 1px solid var(--border); }
.max-w-440 { max-width: 440px; }
.border-b { border-bottom: 1px solid var(--border); }
.text-left { text-align: left; }
"""

filepath = '/home/mark/Dev/ruivobarber/frontend/src/styles/layout.css'
with open(filepath, 'a', encoding='utf-8') as f:
    f.write(css_content)

print("CSS classes appended.")
