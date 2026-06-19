#!/usr/bin/env python3
import os
import re
import json
import urllib.request

TOKEN = os.getenv("GITHUB_TOKEN", "")
PROJECT_ID = "PVT_kwHOAEqFx84Baw1O"
STATUS_FIELD_ID = "PVTSSF_lAHOAEqFx84Baw1OzhVmDmc"

# Map statuses to option IDs
STATUS_OPTIONS = {
    "todo": "f75ad846",        # Backlog
    "in_progress": "47fc9ee4", # In progress
    "done": "98236657"         # Done
}

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KANBAN_DIR = os.path.join(BASE_DIR, ".antigravity", "kanban")
LOGS_DIR = os.path.join(BASE_DIR, ".antigravity", "logs")

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
        return json.loads(resp.read().decode("utf-8"))

def parse_markdown_tasks(filepath):
    tasks = []
    if not os.path.exists(filepath):
        return tasks
    task_re = re.compile(r"-\s*\[[ xX/]\]\s*(\[TASK-(\d+)\]\s*(.+))")
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            match = task_re.search(line)
            if match:
                full_title = match.group(1).strip()
                task_id = match.group(2).zfill(3)
                title_only = match.group(3).strip()
                tasks.append({
                    "full_title": full_title,
                    "task_id": task_id,
                    "title": title_only
                })
    return tasks

def get_all_project_items():
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
                      body
                    }}
                    ... on Issue {{
                      id
                      title
                      body
                    }}
                  }}
                  fieldValues(first: 20) {{
                    nodes {{
                      ... on ProjectV2ItemFieldSingleSelectValue {{
                        name
                        field {{
                          ... on ProjectV2FieldCommon {{
                            name
                          }}
                        }}
                      }}
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
            content = node.get("content")
            if content:
                title = content.get("title", "")
                body = content.get("body", "")
                
                status_name = ""
                for val in node.get("fieldValues", {}).get("nodes", []):
                    if val.get("field", {}).get("name") == "Status":
                        status_name = val.get("name", "")
                        break
                        
                items.append({
                    "item_id": node["id"],
                    "content_id": content.get("id"),
                    "title": title,
                    "body": body,
                    "status": status_name.lower()
                })
        if not page["pageInfo"]["hasNextPage"]:
            break
        cursor = page["pageInfo"]["endCursor"]
    return items

def read_log_file(task_id):
    path = os.path.join(LOGS_DIR, f"log-task-{task_id}.md")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    return ""

def add_draft_issue(title, body):
    query = """
    mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {projectId: $projectId, title: $title, body: $body}) {
        projectItem {
          id
          content {
            ... on DraftIssue {
              id
            }
          }
        }
      }
    }
    """
    data = graphql(query, {"projectId": PROJECT_ID, "title": title, "body": body})
    item = data["data"]["addProjectV2DraftIssue"]["projectItem"]
    return item["id"], item.get("content", {}).get("id")

def update_draft_issue(draft_id, title, body):
    query = """
    mutation($draftIssueId: ID!, $title: String!, $body: String!) {
      updateProjectV2DraftIssue(input: {
        draftIssueId: $draftIssueId
        title: $title
        body: $body
      }) {
        draftIssue { id }
      }
    }
    """
    graphql(query, {"draftIssueId": draft_id, "title": title, "body": body})

def update_item_status(item_id, option_id):
    query = """
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item { id }
      }
    }
    """
    graphql(query, {
        "projectId": PROJECT_ID,
        "itemId": item_id,
        "fieldId": STATUS_FIELD_ID,
        "optionId": option_id
    })

def main():
    if not TOKEN:
        print("GITHUB_TOKEN not found in environment.")
        return

    print("Reading local kanban files...")
    todo_tasks = parse_markdown_tasks(os.path.join(KANBAN_DIR, "todo.md"))
    doing_tasks = parse_markdown_tasks(os.path.join(KANBAN_DIR, "in_progress.md"))
    done_tasks = parse_markdown_tasks(os.path.join(KANBAN_DIR, "done.md"))

    print(f"Loaded: Todo={len(todo_tasks)}, Doing={len(doing_tasks)}, Done={len(done_tasks)}")

    local_tasks = []
    for t in todo_tasks:
        t["target_status"] = "todo"
        local_tasks.append(t)
    for t in doing_tasks:
        t["target_status"] = "in_progress"
        local_tasks.append(t)
    for t in done_tasks:
        t["target_status"] = "done"
        local_tasks.append(t)

    print("Fetching GitHub Project V2 items...")
    gh_items = get_all_project_items()
    print(f"Found {len(gh_items)} items on GitHub Projects.")

    # Match by TASK-XXX identifier
    gh_by_task = {}
    task_num_re = re.compile(r"\[TASK-(\d+)\]")
    for item in gh_items:
        match = task_num_re.search(item["title"])
        if match:
            task_num = match.group(1).zfill(3)
            gh_by_task[task_num] = item

    for local in local_tasks:
        task_id = local["task_id"]
        title = local["full_title"]
        status = local["target_status"]
        option_id = STATUS_OPTIONS[status]

        # Get body if task is done and has local log
        body = ""
        if status == "done":
            body = read_log_file(task_id)

        if task_id in gh_by_task:
            # Task exists on board, check if updates needed
            gh_item = gh_by_task[task_id]
            item_id = gh_item["item_id"]
            
            # 1. Update status if different
            gh_status_mapped = gh_item["status"]
            # normalize names
            if gh_status_mapped == "backlog" or gh_status_mapped == "todo":
                gh_status_norm = "todo"
            elif gh_status_mapped == "in progress" or gh_status_mapped == "doing":
                gh_status_norm = "in_progress"
            elif gh_status_mapped == "done" or gh_status_mapped == "concluído":
                gh_status_norm = "done"
            else:
                gh_status_norm = gh_status_mapped

            if gh_status_norm != status:
                print(f"🔄 Updating status of [TASK-{task_id}]: {gh_status_norm} -> {status}")
                update_item_status(item_id, option_id)

            # 2. Update body if it's a draft issue and body changed
            if gh_item["content_id"] and gh_item["content_id"].startswith("DI_"):
                # It's a draft issue
                if body and gh_item["body"] != body:
                    print(f"📝 Updating description of [TASK-{task_id}]...")
                    update_draft_issue(gh_item["content_id"], title, body)
        else:
            # Create new card
            print(f"➕ Creating [TASK-{task_id}] '{title}' on board...")
            item_id, content_id = add_draft_issue(title, body)
            update_item_status(item_id, option_id)

    print("Sync completed!")

if __name__ == "__main__":
    main()
