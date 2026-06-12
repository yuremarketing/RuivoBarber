#!/usr/bin/env python3
import argparse
import json
import urllib.request
import os
import sys

# Configurações globais
GRAPHQL_URL = "https://api.github.com/graphql"
PROJECT_ID = "PVT_kwHOAEqFx84BaAE4"
STATUS_FIELD_ID = "PVTSSF_lAHOAEqFx84BaAE4zhU6sss"
DONE_OPTION_ID = "98236657"

def run_query(query, variables, token):
    headers = {
        "Authorization": f"bearer {token}",
        "Content-Type": "application/json",
        "User-Agent": "Antigravity-Agent"
    }
    payload = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    req = urllib.request.Request(GRAPHQL_URL, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if "errors" in res_data:
                print("[-] Erro retornado pela API do GitHub:", json.dumps(res_data["errors"], indent=2))
                sys.exit(1)
            return res_data["data"]
    except Exception as e:
        print(f"[-] Falha na requisição HTTP: {e}")
        sys.exit(1)

def get_item_content_id(item_id, token):
    query = """
    query($itemId: ID!) {
      node(id: $itemId) {
        ... on ProjectV2Item {
          content {
            __typename
            ... on DraftIssue {
              id
              title
              body
            }
          }
        }
      }
    }
    """
    data = run_query(query, {"itemId": item_id}, token)
    node = data.get("node")
    if not node:
        print(f"[-] Item {item_id} não encontrado.")
        sys.exit(1)
    
    content = node.get("content")
    if not content:
        print(f"[-] Item {item_id} não possui conteúdo associado.")
        sys.exit(1)
        
    return content.get("__typename"), content.get("id"), content.get("body", "")

def update_draft_issue_body(draft_id, new_body, token):
    mutation = """
    mutation($draftId: ID!, $body: String!) {
      updateProjectV2DraftIssue(input: { draftIssueId: $draftId, body: $body }) {
        draftIssue {
          id
        }
      }
    }
    """
    run_query(mutation, {"draftId": draft_id, "body": new_body}, token)

def move_item_to_done(item_id, token):
    mutation = """
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId,
        itemId: $itemId,
        fieldId: $fieldId,
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item {
          id
        }
      }
    }
    """
    run_query(mutation, {
        "projectId": PROJECT_ID,
        "itemId": item_id,
        "fieldId": STATUS_FIELD_ID,
        "optionId": DONE_OPTION_ID
    }, token)

def main():
    parser = argparse.ArgumentParser(description="Automatiza o encerramento documentado de tarefas no GitHub Projects v2.")
    parser.add_argument("--item-id", required=True, help="ID do item no ProjectV2Item.")
    parser.add_argument("--summary", required=True, help="O que foi implementado.")
    parser.add_argument("--tests", required=True, help="O que foi testado.")
    parser.add_argument("--results", required=True, help="Resultados obtidos.")
    parser.add_argument("--walkthrough", default="", help="Link para o walkthrough/relatório local.")
    parser.add_argument("--token", help="Token do GitHub (pode ser definido via env GITHUB_TOKEN).")
    
    args = parser.parse_args()
    
    token = args.token or os.getenv("GITHUB_TOKEN")
    if not token:
        print("[-] Erro: Token do GitHub não fornecido. Defina a variável de ambiente GITHUB_TOKEN ou use --token.")
        sys.exit(1)
        
    print(f"[+] Iniciando processo de encerramento para o item: {args.item_id}")
    
    # 1. Obter informações de conteúdo do item
    typename, content_id, current_body = get_item_content_id(args.item_id, token)
    
    # 2. Formatar o bloco de encerramento técnico
    closure_report = f"""

---

### 🛡️ Relatório Técnico de Encerramento (Automático)

* **O que foi feito:** {args.summary}
* **Testes executados:** {args.tests}
* **Resultados:** {args.results}
"""
    if args.walkthrough:
        closure_report += f"* **Walkthrough Relacionado:** {args.walkthrough}\n"
        
    updated_body = current_body + closure_report
    
    # 3. Se for DraftIssue, atualizar a descrição (body)
    if typename == "DraftIssue":
        print("[+] Atualizando a descrição do DraftIssue com o relatório técnico...")
        update_draft_issue_body(content_id, updated_body, token)
    else:
        print(f"[*] Tipo de conteúdo '{typename}' não suporta atualização direta de body via ProjectV2. Pulando.")
        
    # 4. Mover para a coluna "Done"
    print("[+] Movendo o card para a coluna 'Done' (Concluído)...")
    move_item_to_done(args.item_id, token)
    
    print("✅ Tarefa encerrada e documentada com sucesso no GitHub!")

if __name__ == "__main__":
    main()
