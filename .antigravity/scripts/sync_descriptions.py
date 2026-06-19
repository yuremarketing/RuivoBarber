#!/usr/bin/env python3
"""
Sync descriptions from local log files to GitHub Projects draft issues.
"""
import json
import urllib.request
import re
import os

TOKEN = os.getenv("GITHUB_TOKEN", "")
PROJECT_ID = "PVT_kwHOAEqFx84Baw1O"
LOGS_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")

def graphql(query, variables=None):
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.github.com/graphql",
        data=data,
        headers={
            "Authorization": f"bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def get_all_project_items():
    """Fetch all draft items with their draftIssue IDs and titles."""
    items = []
    cursor = None
    while True:
        after = f', after: "{cursor}"' if cursor else ""
        result = graphql(f"""
        {{
          node(id: "{PROJECT_ID}") {{
            ... on ProjectV2 {{
              items(first: 50{after}) {{
                pageInfo {{ hasNextPage endCursor }}
                nodes {{
                  id
                  content {{
                    ... on DraftIssue {{
                      id
                      title
                    }}
                  }}
                }}
              }}
            }}
          }}
        }}
        """)
        page = result["data"]["node"]["items"]
        for node in page["nodes"]:
            content = node.get("content", {})
            if content and "id" in content and "title" in content:
                items.append({
                    "item_id": node["id"],
                    "draft_id": content["id"],
                    "title": content["title"],
                })
        if not page["pageInfo"]["hasNextPage"]:
            break
        cursor = page["pageInfo"]["endCursor"]
    return items

def extract_task_number(title):
    """Extract task number like 001 from title like [TASK-001] ..."""
    match = re.search(r'\[TASK-(\d+)\]', title)
    if match:
        return match.group(1).zfill(3)
    return None

def read_log(task_num):
    """Read local log file for a task number."""
    path = os.path.join(LOGS_DIR, f"log-task-{task_num}.md")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return None

def update_draft_body(draft_id, body):
    """Update the body of a draft issue."""
    result = graphql(
        """
        mutation($draftId: ID!, $body: String!) {
          updateProjectV2DraftIssue(input: { draftIssueId: $draftId, body: $body }) {
            draftIssue { id title }
          }
        }
        """,
        {"draftId": draft_id, "body": body},
    )
    return result

# --- Main ---
print("🔍 Buscando todos os items do projeto GitHub...\n")
items = get_all_project_items()
print(f"📋 Total de items encontrados: {len(items)}\n")

ok = 0
skip = 0
fail = 0

for item in items:
    title = item["title"]
    task_num = extract_task_number(title)
    
    if not task_num:
        print(f"⚠️  Sem número de task: {title}")
        skip += 1
        continue
    
    body = read_log(task_num)
    if not body:
        print(f"⚠️  Log não encontrado para TASK-{task_num}: {title}")
        skip += 1
        continue
    
    try:
        update_draft_body(item["draft_id"], body)
        print(f"✅ [TASK-{task_num}] Descrição atualizada")
        ok += 1
    except Exception as e:
        print(f"❌ [TASK-{task_num}] Falhou → {e}")
        fail += 1

print(f"\n{'='*50}")
print(f"✅ Atualizadas: {ok}")
print(f"⚠️  Puladas:    {skip}")
print(f"❌ Falhas:      {fail}")
