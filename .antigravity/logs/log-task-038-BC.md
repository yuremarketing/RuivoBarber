# Log de Execução: [TASK-038-BC] [Wizard/Profile] Banco de Dados e Backend para Perfis de Barbeiros (Foto e Avaliação Média)

- **Autor**: Antigravity (LLM)
- **Data**: 2026-06-21
- **Branch**: `feature/TASK-043-modelagem-clas`

## Resumo das Alterações
Adicionada a estrutura de banco de dados e as propriedades de backend em Go para suportar perfis enriquecidos de barbeiros com imagem de perfil (`FotoURL`) e nota média de avaliação (`AvaliacaoMedia`). Isso fornece a infraestrutura que o Wizard de Agendamento (`BookingWizard.jsx` / `TASK-038-B`) necessita para exibir dados reais na tela de clientes.

## Arquivos Modificados/Criados
- [NEW] [backend/cmd/api/migrations/002_add_barbeiro_profile.sql](file:///home/mark/Dev/ruivobarber/backend/cmd/api/migrations/002_add_barbeiro_profile.sql)
- [MOD] [backend/cmd/api/schema.sql](file:///home/mark/Dev/ruivobarber/backend/cmd/api/schema.sql)
- [MOD] [scripts/init.sql](file:///home/mark/Dev/ruivobarber/scripts/init.sql)
- [MOD] [backend/cmd/api/main.go](file:///home/mark/Dev/ruivobarber/backend/cmd/api/main.go)
- [MOD] [backend/internal/core/domain/barbeiro.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/domain/barbeiro.go)
- [MOD] [backend/internal/adapters/repositories/cliente_pg_repository.go](file:///home/mark/Dev/ruivobarber/backend/internal/adapters/repositories/cliente_pg_repository.go)
- [MOD] [scripts/test_transaction_lock.sh](file:///home/mark/Dev/ruivobarber/scripts/test_transaction_lock.sh)
- [MOD] [.antigravity/kanban/todo.md](file:///home/mark/Dev/ruivobarber/.antigravity/kanban/todo.md)
- [MOD] [.antigravity/kanban/done.md](file:///home/mark/Dev/ruivobarber/.antigravity/kanban/done.md)

## Como Validar / Testar
1. Subir e reiniciar o backend via Docker Compose:
   ```bash
   docker compose build backend && docker compose up -d backend
   ```
2. Validar que as migrações automáticas de banco de dados rodaram com sucesso nos logs do contêiner.
3. Testar a chamada à API autenticada e verificar se o JSON inclui as novas chaves:
   ```bash
   curl -s -H "Authorization: Bearer <TOKEN>" "http://localhost:8080/api/v1/barbeiros"
   ```
4. Executar os testes de integração:
   ```bash
   bash ./scripts/test_transaction_lock.sh
   bash ./scripts/test_no_show_penalty.sh
   bash ./scripts/test_coupon_redemption.sh
   ```

## Verificação dos Requisitos (.antigravityrules)
- [x] Lógica de negócio isolada no backend? (Sim, queries atualizadas no repositório de clientes e campos mapeados no domínio de barbeiro)
- [x] Nomenclatura em conformidade e tipos corretos?
