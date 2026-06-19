# Diretrizes de Governança de Backlog — Petwork

Este documento estabelece o processo oficial e obrigatório para gerenciamento de tarefas, numeração de identificadores e rastreabilidade no projeto Petwork.

---

## 1. Fonte Oficial de Verdade
A numeração e a listagem de tarefas no projeto seguem uma estrutura de arquivos locais como a única fonte soberana de verdade:
* **Backlog Ativo:** `.antigravity/kanban/todo.md`
* **Tarefas Concluídas:** `.antigravity/kanban/done.md`

Nenhum ID de tarefa pode ser assumido ou criado sem antes consultar esses arquivos.

---

## 2. Processo para Criação de Novas Tarefas
Sempre que uma nova tarefa for adicionada ao backlog:
1. **Consulta:** Leia `.antigravity/kanban/todo.md` e `.antigravity/kanban/done.md`.
2. **Identificação:** Encontre o maior número identificador utilizado (ex: `TASK-026`).
3. **Reserva:** Defina o próximo ID disponível (ex: `TASK-027`).
4. **Registro Local:** Escreva a tarefa no arquivo `todo.md`.
5. **Sincronização no GitHub Projects:** Registre a tarefa no GitHub Projects utilizando a API GraphQL contendo o título formatado `[TASK-XXX] Nome` e a descrição detalhada (`body`).

---

## 3. Regras e Proibições Rígidas
* **Proibido Reutilizar IDs:** Identificadores de tarefas concluídas ou canceladas jamais podem ser reciclados para novas funcionalidades.
* **Proibida Criação Ad-hoc:** Nenhum agente de IA ou desenvolvedor humano deve iniciar codificação baseada em um identificador sem que o mesmo tenha sido registrado na fonte oficial e sincronizado com o Kanban.
* **Proibido Payload sem Descrição:** Qualquer tarefa adicionada ao GitHub Projects deve conter o detalhamento técnico do objetivo e requisitos no corpo da mensagem.

---

## 4. Auditoria e Rastreabilidade Cruzada
Toda tarefa concluída deve registrar:
1. **Log de Execução:** Um arquivo `.antigravity/logs/log-task-XXX.md` detalhando as alterações e arquivos modificados.
2. **Referência no Done.md:** Link para o log correspondente.
3. **Mensagem de Commit:** Commits no Git devem incluir o identificador correspondente (ex: `feat: implement TASK-XXX ...`).
