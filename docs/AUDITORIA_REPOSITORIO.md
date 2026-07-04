# 📊 Auditoria de Consolidação do Repositório (Pós-Fase 67)

> [!WARNING]
> **Aviso de Acesso à API:** Devido à correta remediação de segurança aplicada na **Issue #69**, o `GITHUB_TOKEN` foi revogado. A auditoria de Issues, Pull Requests e Projetos no portal web não pôde ser consultada automaticamente via API. O mapeamento abaixo foi inteiramente extraído do estado profundo do Git (Remote + Local).

---

## 1. Estado das Branches Principais

### `develop` (Branch de Trabalho Atual)
- **Status:** **Saudável e Ativa**.
- **Última Modificação:** 2026-07-04 (Commits das Fases 2 a 5 da Issue #67).
- **Relatório:** É a branch mais atualizada. Contém todo o código consolidado, Sentry, Ops Dashboard, worker RPG e as correções da sprint.

### `main` (Produção)
- **Status:** 🚨 **Dívida Técnica Histórica Acumulada**
- **Última Modificação:** 2026-06-18 (Autor: yuremarketing).
- **Divergência:** Está **162 commits atrás** da `develop`. 
- **Recomendação [P0]:** Criar um Release Candidate imediatamente e fazer merge da `develop` para a `main`. Existe código massivo não incorporado à produção.

---

## 2. Matriz Executiva de Branches de Feature (Stale / Órfãs)

| Branch | Última Atualização | Autor | Ahead de Develop (Commits Únicos) | Ação / Risco |
| :--- | :--- | :--- | :---: | :--- |
| `feature/dota2-redesign-phase2` | 27 Jun | yuremarketing | 0 | ✅ **Pode ser removida**. Código já mergeado na `develop`. |
| `feature/dota2-redesign-foundation` | 27 Jun | yuremarketing | 0 | ✅ **Pode ser removida**. Código já mergeado na `develop`. |
| `feature/barber-scheduling-locks...`| 24 Jun | ijapxdotcom | 0 | ✅ **Pode ser removida**. Código já mergeado. |
| `test-develop-rewrite` | 24 Jun | ijapxdotcom | **3** | ⚠️ **P1 (Revisar)**. Possui 3 commits órfãos. |
| `test-main-rewrite` | 24 Jun | ijapxdotcom | **3** | ⚠️ **P1 (Revisar)**. Cópia exata da test-develop. Possui os mesmos 3 commits. |
| `feature/revert-japa-merge` | 25 Jun | yuremarketing | **2** | ⚠️ **P1 (Revisar)**. Possui 2 commits órfãos. |
| `feature/mock-auth-fixes` | 25 Jun | yuremarketing | **1** | ⚠️ **P1 (Revisar)**. |
| `feature/re-merge-japa-with-rules` | 25 Jun | yuremarketing | **1** | ⚠️ **P1 (Revisar)**. |
| `feature/fix-timezone-agendamentos` | 22 Jun | yuremarketing | **1** | ⚠️ **P2 (Revisar)**. Provavelmente esquecida. |
| `feature/wizard-calendar-restore` | 22 Jun | yuremarketing | **1** | ⚠️ **P2 (Revisar)**. Provavelmente esquecida. |

---

## 3. Respostas Executivas

**1. Existem PRs esquecidos?**
Embora não possamos consultar a UI do GitHub agora, o fato de existirem branches `test-*` e `feature/*` com **1 a 3 commits de diferença** em relação à develop indica fortemente PRs não finalizados ou branches abandonadas (Stale). 

**2. Existe código não incorporado à develop?**
**Sim.** Existem cerca de 12 commits de código espalhados em 7 branches esquecidas que nunca foram mergeados para a `develop`. São possíveis códigos órfãos ou refatorações descartadas.

**3. Existe código não incorporado à main?**
**Sim, de forma alarmante.** A branch `main` está congelada em 18 de Junho, enquanto a `develop` avançou mais de **162 commits** (Dota2 UI, Worker RPG, Sentry, Segurança).

**4. Existe dívida técnica histórica acumulada?**
**Sim.** A falta de merges sistemáticos entre `develop` e `main` quebrou o fluxo de CI/CD. Várias branches do antigo mantenedor (`ijapxdotcom`) ficaram paradas.

**5. Existe branch que deveria ter sido encerrada após as Issues #66/#67?**
Como as issues #66 e #67 ocorreram inteiramente dentro da branch `develop` ou através de _fast-forwards_, não restaram branches específicas dessas issues. Porém, as branches de `dota2-redesign` (que antecederam a sprint atual) estão limpas e já deveriam ter sido deletadas.

---

## 4. Prioridade de Limpeza (Plano de Ação)

- 🚨 **P0 – Revisar imediatamente:** Efetuar o processo de homologação e Merge da `develop` para a `main`. Isso normalizará a paridade entre os ambientes.
- ⚠️ **P1 – Revisar esta semana:** Inspecionar o código isolado de `test-develop-rewrite`, `feature/mock-auth-fixes` e os branches "japa". Verificar se o código ali dentro precisa ser resgatado com um `cherry-pick` ou se pode ser permanentemente deletado.
- ♻️ **P2 – Pode aguardar:** Deletar `feature/dota2-redesign-phase2`, `feature/dota2-redesign-foundation` e `feature/barber-scheduling-locks-and-blockings`, pois já estão integradas à `develop`.
