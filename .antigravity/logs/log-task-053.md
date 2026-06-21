# Log de Execução: [TASK-053 & TASK-046] [Guilds] Ranking, Mural de Recados e Painel de Clãs

- **Autor**: Antigravity (LLM)
- **Data**: 2026-06-21
- **Branch**: `feature/TASK-043-modelagem-clas`

## Resumo das Alterações
Implementação da interface visual completa para Clãs & Guildas (Dashboard, Missões Semanais, Ranking e Mural de Recados) no React frontend e adição das queries e handlers de suporte no Go backend. 
1. **Banco de Dados**: Criada a tabela `ClaMural` para armazenar o chat interno de cada clã.
2. **Backend**:
   - Criada rota `GET /api/v1/clas` para listar os clãs ordenados no Leaderboard (nível & XP).
   - Criados endpoints `GET /api/v1/clas/me/mural` e `POST /api/v1/clas/me/mural` com validações de cargo e clã para postagem de recados de membros.
   - Criada rota `GET /api/v1/jogadores/busca?query=...` para buscar jogadores livres (sem clã) por nome ou login.
3. **Frontend**:
   - Adicionadas chamadas à API no `api.js`.
   - Mapeada rota `/clas` e integrada no menu da `Sidebar.jsx` para os clientes.
   - Criada a página `ClasPage.jsx` com visual medieval/RPG segmentada em abas:
     - **Painel do Clã**: Informações de nível, XP coletivo, lema, lista de membros e progresso das missões semanais da guilda. Se for o líder, exibe busca e convite de novos guerreiros sem clã.
     - **Mural de Recados**: Feed de chat persistente e formulário de postagem.
     - **Leaderboard**: Classificação comparativa ordenada de todas as guildas do reino.
     - **Sem Clã View**: Convites recebidos com opção de Aceitar/Recusar e formulário para fundar nova guilda.

## Arquivos Modificados/Criados
- [MOD] [backend/cmd/api/main.go](file:///home/mark/Dev/ruivobarber/backend/cmd/api/main.go)
- [MOD] [backend/cmd/api/schema.sql](file:///home/mark/Dev/ruivobarber/backend/cmd/api/schema.sql)
- [MOD] [scripts/init.sql](file:///home/mark/Dev/ruivobarber/scripts/init.sql)
- [MOD] [backend/internal/core/domain/cla.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/domain/cla.go)
- [MOD] [backend/internal/core/ports/cla_repository.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/ports/cla_repository.go)
- [MOD] [backend/internal/adapters/repositories/cla_pg_repository.go](file:///home/mark/Dev/ruivobarber/backend/internal/adapters/repositories/cla_pg_repository.go)
- [MOD] [backend/internal/core/services/cla_service.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/services/cla_service.go)
- [MOD] [backend/internal/adapters/handlers/cla_handler.go](file:///home/mark/Dev/ruivobarber/backend/internal/adapters/handlers/cla_handler.go)
- [MOD] [frontend/src/services/api.js](file:///home/mark/Dev/ruivobarber/frontend/src/services/api.js)
- [MOD] [frontend/src/components/Sidebar.jsx](file:///home/mark/Dev/ruivobarber/frontend/src/components/Sidebar.jsx)
- [MOD] [frontend/src/App.jsx](file:///home/mark/Dev/ruivobarber/frontend/src/App.jsx)
- [NEW] [frontend/src/pages/ClasPage.jsx](file:///home/mark/Dev/ruivobarber/frontend/src/pages/ClasPage.jsx)
- [NEW] [scripts/test_clans_features.sh](file:///home/mark/Dev/ruivobarber/scripts/test_clans_features.sh)

## Como Validar / Testar
Execute o script de testes de integração no terminal para verificar a integridade da API:
```bash
./scripts/test_clans_features.sh
```

## Verificação dos Requisitos (.antigravityrules)
- [x] Lógica de negócio isolada em `internal/core/services` no backend? (Sim, em `cla_service.go`)
- [x] Interfaces/ports criadas ou atualizadas antes da implementação de adaptadores? (Sim, em `cla_repository.go`)
- [x] Nomenclatura em português e rotas REST em letras minúsculas?
