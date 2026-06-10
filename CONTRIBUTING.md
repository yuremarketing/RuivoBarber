# 📖 Guia de Contribuição - RuivoBarber

Bem-vindo ao time de desenvolvimento do **RuivoBarber**! Para mantermos o código organizado, limpo e integrado de forma segura, siga as diretrizes abaixo.

---

## 📌 Modelo de Branches (Git Flow Simplificado)

Trabalhamos com duas branches principais permanentes e branches temporárias para novas tarefas.

### Branches Principais
*   **`main` (Produção)**: Contém o código totalmente homologado e pronto para deploy. **Nunca envie commits diretos para esta branch**.
*   **`develop` (Integração)**: Branch central de desenvolvimento onde as novas funcionalidades são testadas juntas.

### Branches Temporárias
*   **`feature/*`**: Para novas funcionalidades (ex: `feature/frontend-jwt-auth`). Criada a partir da `develop`.
*   **`bugfix/*`**: Para correção de bugs (ex: `bugfix/api-404-handling`). Criada a partir da `develop`.
*   **`hotfix/*`**: Para correções críticas em produção (ex: `hotfix/corrigir-crash-db`). Criada a partir da `main`.

---

## ⚙️ Convenção de Commits (Semantic Commits)

Adotamos commits semânticos para facilitar a leitura do histórico do git. Exemplos:

*   `feat: adiciona componente de progresso gamificado no painel`
*   `fix: corrige cálculo de XP na conclusão de agendamento`
*   `docs: atualiza documentação do README`
*   `test: adiciona validações de JWT no script E2E`
*   `refactor: melhora estrutura dos handlers no Fiber`

---

## 🤝 Processo de Trabalho e Pull Requests

1.  **Sempre crie uma nova branch a partir da `develop`**:
    ```bash
    git checkout develop
    git pull origin develop
    git checkout -b feature/nome-da-sua-tarefa
    ```
2.  **Desenvolva e realize os testes locais**:
    *   Certifique-se de que os testes modulares e E2E estão passando executando:
        ```bash
        bash scripts/e2e_admin_test.sh
        ```
3.  **Abra um Pull Request (PR)**:
    *   Envie sua branch para o GitHub.
    *   Abra o PR direcionando para a branch `develop`.
    *   Solicite a revisão de pelo menos um outro colega.
    *   Use **Squash and Merge** ao aprovar e finalizar o PR.
