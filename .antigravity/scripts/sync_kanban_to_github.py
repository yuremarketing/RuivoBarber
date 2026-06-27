#!/usr/bin/env python3
import os
import re
import json
import urllib.request
import urllib.error
import time
import socket
import sys

TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
PROJECT_ID = "PVT_kwHOAEqFx84BaAE4"
STATUS_FIELD_ID = "PVTSSF_lAHOAEqFx84BaAE4zhU6sss"
LOCK_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sync_kanban.lock")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KANBAN_DIR = os.path.join(BASE_DIR, ".antigravity", "kanban")
LOGS_DIR = os.path.join(BASE_DIR, ".antigravity", "logs")

# Métricas de Execução
stats = {"created": 0, "updated": 0, "ignored": 0, "errors": 0}

def graphql_request_with_backoff(query, variables=None, retries=4, delay=2.0):
    """Executa requisições GraphQL com timeout rígido, backoff exponencial e retry para 429/5xx."""
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
    
    for attempt in range(retries):
        try:
            # Timeout rígido de 15 segundos para evitar travamentos silenciosos
            with urllib.request.urlopen(req, timeout=15) as resp:
                res_data = json.loads(resp.read().decode("utf-8"))
                if "errors" in res_data:
                    # Loga apenas o sumário do erro sem expor segredos ou payloads completos
                    err_msg = "; ".join([e.get("message", "Unknown error") for e in res_data["errors"]])
                    raise Exception(f"GraphQL erro: {err_msg}")
                return res_data
        except urllib.error.HTTPError as e:
            # Retry para limites de taxa (429) e erros do servidor GitHub (5xx)
            if e.code == 429 or e.code >= 500:
                sleep_time = delay * (2 ** attempt)
                print(f"[WARN] HTTP {e.code} detectado. Tentativa {attempt + 1}/{retries}. Aguardando {sleep_time}s...")
                time.sleep(sleep_time)
                continue
            elif e.code == 401:
                raise Exception("Não autorizado (401). GITHUB_TOKEN inválido.")
            raise Exception(f"HTTP Erro {e.code}")
        except (urllib.error.URLError, socket.timeout) as e:
            sleep_time = delay * (2 ** attempt)
            print(f"[WARN] Falha na conexão ou Timeout. Tentativa {attempt + 1}/{retries}. Aguardando {sleep_time}s...")
            time.sleep(sleep_time)
            
    raise Exception("Falha de comunicação com o GitHub após esgotar tentativas.")

def parse_markdown_tasks(filepath):
    tasks = []
    if not os.path.exists(filepath):
        print(f"[WARN] Arquivo local ausente: {filepath}")
        return tasks
        
    task_re = re.compile(r"^\s*-\s*\[[ xX/]\]\s*(\[TASK-(\d+)\]\s*(.+))")
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

def resolve_status_options():
    """Consulta metadados do projeto e mapeia dinamicamente os nomes das opções para seus IDs."""
    query = f"""
    {{
      node(id: "{PROJECT_ID}") {{
        ... on ProjectV2 {{
          fields(first: 50) {{
            nodes {{
              ... on ProjectV2SingleSelectField {{
                id
                name
                options {{
                  id
                  name
                }}
              }}
            }}
          }}
        }}
      }}
    }}
    """
    options_map = {}
    try:
        res = graphql_request_with_backoff(query)
        fields = res["data"]["node"]["fields"]["nodes"]
        for field in fields:
            if field.get("name") == "Status" and field.get("id") == STATUS_FIELD_ID:
                for opt in field["options"]:
                    name_clean = opt["name"].lower().replace(" ", "_")
                    options_map[name_clean] = opt["id"]
                break
    except Exception as e:
        print(f"[ERROR] Não foi possível resolver opções de status no GitHub: {e}")
        
    # Mapeamentos e fallback seguro
    resolved = {
        "todo": options_map.get("backlog") or options_map.get("todo") or list(options_map.values())[0],
        "in_progress": options_map.get("in_progress") or options_map.get("ready") or list(options_map.values())[0],
        "done": options_map.get("done") or options_map.get("concluído") or list(options_map.values())[0]
    }
    return resolved

def get_all_project_items():
    items = []
    cursor = None
    while True:
        after = f', after: "{cursor}"' if cursor else ""
        query = f"""
        {{
          node(id: "{PROJECT_ID}") {{
            ... on ProjectV2 {{
              items(first: 100{after}) {{
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
        """
        res_data = graphql_request_with_backoff(query)
        page = res_data["data"]["node"]["items"]
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
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"[WARN] Falha ao ler log TASK-{task_id}: {e}")
    return ""

def add_draft_issue(title, body):
    query = """
    mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {projectId: $projectId, title: $title, body: $body}) {
        projectItem {
          id
          content { ... on DraftIssue { id } }
        }
      }
    }
    """
    res_data = graphql_request_with_backoff(query, {"projectId": PROJECT_ID, "title": title, "body": body})
    item = res_data["data"]["addProjectV2DraftIssue"]["projectItem"]
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
    graphql_request_with_backoff(query, {"draftIssueId": draft_id, "title": title, "body": body})

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
    graphql_request_with_backoff(query, {
        "projectId": PROJECT_ID,
        "itemId": item_id,
        "fieldId": STATUS_FIELD_ID,
        "optionId": option_id
    })

def main():
    if not TOKEN:
        print("[ERROR] GITHUB_TOKEN ausente do ambiente.")
        sys.exit(1)

    # Controle de Concorrência via Lock File
    if os.path.exists(LOCK_FILE):
        print(f"[WARN] Execução bloqueada: Arquivo de trava '{LOCK_FILE}' detectado (outra instância ativa).")
        sys.exit(0)

    try:
        with open(LOCK_FILE, "w") as lock:
            lock.write(str(os.getpid()))
            
        print("[INFO] Lendo arquivos locais de Kanban...")
        todo_tasks = parse_markdown_tasks(os.path.join(KANBAN_DIR, "todo.md"))
        doing_tasks = parse_markdown_tasks(os.path.join(KANBAN_DIR, "in_progress.md"))
        done_tasks = parse_markdown_tasks(os.path.join(KANBAN_DIR, "done.md"))

        print(f"[INFO] Tarefas locais carregadas: Todo={len(todo_tasks)}, Doing={len(doing_tasks)}, Done={len(done_tasks)}")

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

        print("[INFO] Resolvendo opções de status no GitHub...")
        status_options = resolve_status_options()

        print("[INFO] Buscando itens atuais do quadro no GitHub...")
        gh_items = get_all_project_items()
        print(f"[INFO] Encontrados {len(gh_items)} itens no GitHub Projects.")

        # Tratamento de duplicidade e mapeamento por ID (TASK-XXX)
        gh_by_task = {}
        task_num_re = re.compile(r"\[TASK-(\d+)\]")
        for item in gh_items:
            match = task_num_re.search(item["title"])
            if match:
                task_num = match.group(1).zfill(3)
                if task_num in gh_by_task:
                    print(f"[WARN] Card duplicado para a TASK-{task_num} no GitHub. Sincronizando apenas a primeira ocorrência.")
                    stats["ignored"] += 1
                else:
                    gh_by_task[task_num] = item

        for local in local_tasks:
            task_id = local["task_id"]
            title = local["full_title"]
            status = local["target_status"]
            option_id = status_options[status]

            body = ""
            if status == "done":
                body = read_log_file(task_id)

            if task_id in gh_by_task:
                gh_item = gh_by_task[task_id]
                item_id = gh_item["item_id"]
                
                # Normalização de status
                gh_status_mapped = gh_item["status"]
                if gh_status_mapped in ["backlog", "todo", "ready"]:
                    gh_status_norm = "todo"
                elif gh_status_mapped in ["in progress", "doing", "in_progress"]:
                    gh_status_norm = "in_progress"
                elif gh_status_mapped in ["done", "concluído"]:
                    gh_status_norm = "done"
                else:
                    gh_status_norm = gh_status_mapped

                need_update = False
                # 1. Sincronizar status
                if gh_status_norm != status:
                    print(f"[INFO] 🔄 Atualizando status de [TASK-{task_id}]: {gh_status_norm} -> {status}")
                    try:
                        update_item_status(item_id, option_id)
                        need_update = True
                    except Exception as e:
                        print(f"[ERROR] Falha ao atualizar status da [TASK-{task_id}]: {e}")
                        stats["errors"] += 1

                # 2. Sincronizar título e descrição (somente para rascunhos de issue)
                if gh_item["content_id"] and gh_item["content_id"].startswith("DI_"):
                    if gh_item["title"] != title or gh_item["body"] != body:
                        print(f"[INFO] 📝 Atualizando metadados de [TASK-{task_id}]...")
                        try:
                            update_draft_issue(gh_item["content_id"], title, body)
                            need_update = True
                        except Exception as e:
                            print(f"[ERROR] Falha ao atualizar metadados da [TASK-{task_id}]: {e}")
                            stats["errors"] += 1
                
                if need_update:
                    stats["updated"] += 1
                else:
                    stats["ignored"] += 1
            else:
                # Criar nova task
                print(f"[INFO] ➕ Criando [TASK-{task_id}] '{title}' no quadro...")
                try:
                    item_id, content_id = add_draft_issue(title, body)
                    update_item_status(item_id, option_id)
                    stats["created"] += 1
                except Exception as e:
                    print(f"[ERROR] Falha ao criar [TASK-{task_id}]: {e}")
                    stats["errors"] += 1

        print(f"\n[INFO] Sincronização concluída com sucesso!")
        print(f"[INFO] Métricas finais: Criados: {stats['created']}, Atualizados: {stats['updated']}, Ignorados/Mantidos: {stats['ignored']}, Erros: {stats['errors']}")

    finally:
        # Garante a liberação da trava operacional
        if os.path.exists(LOCK_FILE):
            os.remove(LOCK_FILE)

if __name__ == "__main__":
    main()
