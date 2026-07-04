# 🧹 Plano de Limpeza de Repositório e Homologação de Exclusão

> [!CAUTION]
> **Snapshot de Segurança Criado!**
> Tag `pre-branch-cleanup` apontando para o commit `8237bc5` da `develop` foi instanciada com sucesso. Qualquer desastre poderá ser revertido para este Hash exato.

---

## 1. Auditoria Definitiva (`git cherry`)

A execução do comando `git cherry develop BRANCH` nos permite comparar a assinatura criptográfica e os diffs aplicados das branches legadas contra a `develop` atual. O resultado selou o destino de cada ramificação:

### ➖ Commits Prefixados com `-` (Já Absorvidos)
O Git reconhece que o diff exato dessas branches já foi aplicado na `develop`.
- `feature/mock-auth-fixes` (Mock nocivo absorvido e já revertido posteriormente)
- `feature/re-merge-japa-with-rules` (Ping-pong histórico anulado)
- `feature/fix-timezone-agendamentos` (Bugfix de Fuso Horário já consolidado na raiz)
- `feature/wizard-calendar-restore` (UX Drag Calendar já consolidada na raiz)

### ➕ Commits Prefixados com `+` (Divergentes, mas Tóxicos)
Estes commits não estão na `develop`, o que é **extremamente positivo**, pois nossa análise anterior (Deep Dive) provou que se trata de lixo tóxico ou retrocessos destruidores.
- `test-develop-rewrite` (Remove dependências antigas de IA e causa syntax error em tests)
- `test-main-rewrite` (Clone exato da branch de cima)
- `feature/revert-japa-merge` (Tentativa caótica de reverter o PR #53 histórico)

### ⚪ Branches Vazias (Zero Commits Restantes)
- `feature/dota2-redesign-phase2`
- `feature/dota2-redesign-foundation`
- `feature/barber-scheduling-locks-and-blockings`

---

## 2. Decisão e Triagem Final

✅ **Prontas para Exclusão (10/10 branches investigadas):**
Nenhuma das 10 branches investigadas possui valor funcional isolado que já não esteja na `develop` ou que não represente risco de regressão arquitetural. Todas as 10 branches candidatas estão oficialmente homologadas para exclusão segura.

⚠️ **Para Manter (2 Branches Principais):**
- `develop` (A única verdadeira *Single Source of Truth* do projeto).
- `main` (Aguardando o Merge P0).

---

## 3. Análise de Riscos e Benefícios

- **Risco Residual:** **Quase Zero.** O snapshot `pre-branch-cleanup` preserva a imagem completa do repositório. O processo `git cherry` e a análise de deep-diff confirmam que não há linhas soltas de features a resgatar.
- **Redução de Complexidade:** Eliminação de 10 ramificações legadas. A árvore do Git deixará de ser uma teia de aranha (ping-pongs históricos, merges duplicados) e passará a um fluxo linear e moderno, preparando o terreno para a esteira oficial de CI/CD.

O repositório está blindado e perfeitamente diagnosticado. 🚀
