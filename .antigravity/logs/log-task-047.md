# Log de Execução: [TASK-047] [Guilds] Sistema de Missões Semanais do Clã (Quests de Guilda)

- **Autor**: Antigravity (LLM)
- **Data**: 2026-06-20
- **Branch**: `feature/TASK-043-modelagem-clas`

## Resumo das Alterações
Implementação do backend de Missões Semanais do Clã (Quests de Guilda). As missões são rotacionadas dinamicamente a cada semana usando particionamento `SemanaAno` (formato ISOWeek `AAAA-WSS`), e os membros do clã cooperam para avançar no progresso comum. Na conclusão de atendimentos, o progresso do clã é incrementado nas missões vigentes. Ao bater metas de missões, o clã recebe bônus de XP coletivo e sobe de nível de clã se necessário. Inclui rotas da API protegidas por JWT e um worker em background.

## Arquivos Modificados/Criados
- [MOD] [backend/cmd/api/main.go](file:///home/mark/Dev/ruivobarber/backend/cmd/api/main.go)
- [MOD] [backend/cmd/api/schema.sql](file:///home/mark/Dev/ruivobarber/backend/cmd/api/schema.sql)
- [MOD] [backend/internal/adapters/repositories/cliente_pg_repository.go](file:///home/mark/Dev/ruivobarber/backend/internal/adapters/repositories/cliente_pg_repository.go)
- [MOD] [scripts/init.sql](file:///home/mark/Dev/ruivobarber/scripts/init.sql)
- [NEW] [backend/internal/core/domain/quest.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/domain/quest.go)
- [NEW] [backend/internal/core/ports/quest_repository.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/ports/quest_repository.go)
- [NEW] [backend/internal/adapters/repositories/quest_pg_repository.go](file:///home/mark/Dev/ruivobarber/backend/internal/adapters/repositories/quest_pg_repository.go)
- [NEW] [backend/internal/core/services/quest_service.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/services/quest_service.go)
- [NEW] [backend/internal/adapters/handlers/quest_handler.go](file:///home/mark/Dev/ruivobarber/backend/internal/adapters/handlers/quest_handler.go)
- [NEW] [scripts/test_quests.sh](file:///home/mark/Dev/ruivobarber/scripts/test_quests.sh)

## Como Validar / Testar
Abra o terminal e execute o script de integração:
```bash
./scripts/test_quests.sh
```

## Verificação dos Requisitos (.antigravityrules)
- [x] Lógica de negócio isolada em `internal/core/services` no backend? (Sim, em `quest_service.go`)
- [x] Interfaces/ports criadas ou atualizadas antes da implementação de adaptadores? (Sim, em `quest_repository.go`)
- [x] Nomenclatura em português e rotas REST em letras minúsculas?
