# 🛡️ Auditoria de Workflows (GitHub Projects V2) - RuivoBarber

Esta auditoria reflete o estado atual das automações do Kanban em contraste com o fluxo estabelecido na RC-1 (Issue-driven, PRs, branches `develop`/`main`).

## 1. 🟢 Workflows Ativos

| Workflow | Função Real | Benefício | Risco (se desligado) | Recomendação |
| :--- | :--- | :--- | :--- | :--- |
| **Auto-add to project** | Atrela automaticamente toda nova Issue ou PR ao board. | Mantém o board centralizado como fonte da verdade. Nenhuma tarefa criada vaza do Kanban. | Tarefas esquecidas e triagem 100% manual. | P0 - ✅ Manter ligado |
| **Auto-add sub-issues** | Puxa sub-tarefas (tasks/child issues) para o board. | Excelente para quebrar Epics (como as da RC-1) em blocos fáceis de parear. | Sub-tarefas não aparecem, ocultando o trabalho real. | P0 - ✅ Manter ligado |
| **Item added to project**| Joga o item recém-chegado para o status "Backlog" (ou "New"). | Cria a fila de triagem organizada sem status "nulos". | Bagunça visual e cards flutuantes. | P0 - ✅ Manter ligado |
| **Pull request linked** | Move a Issue atrelada para "In Progress" quando o PR é aberto. | Reflete instantaneamente que a engenharia começou a atuar. | Defasagem entre a realidade do código e o Kanban. | P0 - ✅ Manter ligado |
| **Pull request merged** | Move o card para "Done" ou "Ready for Deploy" no merge do PR. | Essencial no fluxo de merge para `develop` ou `main`. Elimina micro-gerenciamento de board. | Falso positivo de gargalo (código entregue mas card em andamento). | P0 - ✅ Manter ligado |
| **Item closed** | Move o card para "Done" se a Issue for fechada (via commit ou CLI). | Garante que se uma Issue for resolvida diretamente sem um PR formal atrelado, o board atualiza (o que ocorreu na Issue #67 agora mesmo). | Inconsistência no Kanban (Issue morta, card vivo). | P0 - ✅ Manter ligado |
| **Auto-close issue** | Fecha a Issue caso o líder arraste o card no board para "Done". | Sincronia bi-direcional. Board limpo = Repo limpo. | Falso acúmulo de débito no repositório. | P0 - ✅ Manter ligado |

## 2. ⚪ Workflows Desativados

| Workflow | Função Real | Benefício | Risco (se mantido desligado) | Recomendação |
| :--- | :--- | :--- | :--- | :--- |
| **Code review approved** | Move o PR para "Ready" após o aval do revisor. | Como teremos mais rigor (P1 de Qualidade) no merge para `main`, essa etapa é visualmente valiosa. | Revisor aprova o PR e ele morre na praia por falta de tracking. | P1 - ✅ Ligar futuramente |
| **Code changes requested**| Devolve o PR para "In Progress" se houver *block* do revisor. | Protege contra código ruim e obriga o dev a agir. | O card continua parecendo pronto, gerando frustração. | P1 - ✅ Ligar futuramente |
| **Item reopened** | Volta a Issue para "In Progress" caso reaberta. | Reduz o atrito humano de ter que achar a Issue no Done e puxar de volta na mão. | Bug/Issue volta a existir mas fica escondida no Kanban de Concluídos. | P1 - ✅ Ligar futuramente |
| **Auto-archive items** | Exclui da visualização itens "Done" após X dias. | Fundamental para a longo prazo. Limpa a UI e melhora o carregamento da tela do Project. | Daqui a 3 meses a coluna Done terá 800 cards estourando a interface. | P2 - Pode aguardar |

---

## 🎯 Matriz de Conclusão e Próximos Passos

O estado atual do seu Github Projects está **EXCELENTE e perfeitamente ajustado** para a dinâmica de entrega atual. Você ativou a "espinha dorsal" bi-direcional (criação automática ↔ fechamento automático). Não há nenhum "P0" (crítico) desligado e também nenhum workflow inútil pesando as requisições do Github Actions.

- **P0 – Deve estar ligado agora**: A fundação atual já cobre todos os P0. 
- **P1 – Recomendado ativar na próxima fase**: Ligar `Code review approved`, `Code changes requested` e `Item reopened` assim que passarmos para a estabilização da **Main (Produção)** onde code reviews (Regressão Issue #68) serão bloqueantes.
- **P2 – Pode permanecer desligado**: O arquivamento pode ficar pra depois da virada de produção (Daqui uns 3 a 6 meses).

Não há urgência em alterar nada agora para prosseguirmos com as próximas missões amanhã.
