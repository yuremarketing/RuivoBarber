#!/usr/bin/env python3
import json
import urllib.request
import urllib.error

import os

TOKEN = os.getenv("GITHUB_TOKEN", "")
PROJECT_ID = "PVT_kwHOAEqFx84Baw1O"
STATUS_FIELD_ID = "PVTSSF_lAHOAEqFx84Baw1OzhVmDmc"
DONE_OPTION_ID = "98236657"

DONE_TASKS = [
    "[TASK-001] Setup inicial das pastas e fluxo de trabalho",
    "[TASK-002] Verificar se o MD contempla casos de uso para cada funcionalidade",
    "[TASK-003] Analisar e Desenhar Engenharia de IA e RAG no Petwork",
    "[TASK-004] Instalar dependências de IA e atualizar o Prisma Schema com pgvector",
    "[TASK-005] Centralização do getTenantId() e refatoração dos imports",
    "[TASK-006] Implementar o Embedder e o Retriever (RAG) com pgvector",
    "[TASK-007] Implementar a Server Action de Chat e Streaming",
    "[TASK-008] Criar interface de chat (UI) no Dashboard para a IA",
    "[TASK-009] Implementar alternador de tema (Claro/Escuro/Sistema)",
    "[TASK-010] Implementar pipeline de ingestão assíncrona para Produtos (Estoque)",
    "[TASK-011] Corrigir fallback não determinístico do getTenantId() no helper de autenticação",
    "[TASK-012] Server Action do Chat com Streaming, RAG e Tool Calling",
    "[TASK-013] Barra de Carregamento Moderna no Login",
    "[TASK-014] Refatoração do Layout com Sidebar do Shadcn/UI (sidebar-07)",
    "[TASK-015] Ajuste de Contraste e Acessibilidade no Dashboard (Modo Claro)",
    "[TASK-016] Consolidação do Perfil do Usuário e Eliminação de Redundância",
    "[TASK-017] Renomeação das Configurações do Sistema e Página de Minha Conta",
    "[TASK-018] Correção de Cores Hardcoded e Ajuste do Modo Claro",
    "[TASK-019] Ajustar botão 'Novo Agendamento' no dashboard para abrir o diálogo de agendamento",
    "[TASK-020] Ajustar botão 'Ver Relatórios' no dashboard para redirecionar para a página financeira",
    "[TASK-021] Ajustar os 4 cards de KPIs no dashboard para redirecionar para suas respectivas páginas",
    "[TASK-025] Ajustar os itens de 'Status do Estoque' para exibir dados reais, tooltips e botão 'Fazer Pedido'",
    "[TASK-026] Governança de Backlog e Controle de Identificadores",
    "[TASK-027] Customização temática da Copa do Mundo na tela de login",
]

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

def add_draft(title):
    result = graphql(
        """
        mutation($projectId: ID!, $title: String!) {
          addProjectV2DraftIssue(input: { projectId: $projectId, title: $title }) {
            projectItem { id }
          }
        }
        """,
        {"projectId": PROJECT_ID, "title": title},
    )
    return result["data"]["addProjectV2DraftIssue"]["projectItem"]["id"]

def set_status(item_id, option_id):
    graphql(
        """
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $projectId,
            itemId: $itemId,
            fieldId: $fieldId,
            value: { singleSelectOptionId: $optionId }
          }) {
            projectV2Item { id }
          }
        }
        """,
        {
            "projectId": PROJECT_ID,
            "itemId": item_id,
            "fieldId": STATUS_FIELD_ID,
            "optionId": option_id,
        },
    )

print(f"Subindo {len(DONE_TASKS)} tasks concluídas para o GitHub Projects...\n")
ok = 0
fail = 0
for title in DONE_TASKS:
    try:
        item_id = add_draft(title)
        set_status(item_id, DONE_OPTION_ID)
        print(f"✅ {title}")
        ok += 1
    except Exception as e:
        print(f"❌ FALHOU: {title} → {e}")
        fail += 1

print(f"\n{'='*50}")
print(f"✅ Criadas com sucesso: {ok}")
print(f"❌ Falhas: {fail}")
