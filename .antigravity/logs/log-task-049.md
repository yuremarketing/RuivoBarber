# Log de Execução: [TASK-049] [Store] Loja de Itens Virtuais RPG (Troca de XP por itens do perfil)

- **Autor**: Antigravity (LLM)
- **Data**: 2026-06-20
- **Branch**: `feature/TASK-043-modelagem-clas`

## Resumo das Alterações
Implementação do backend da Loja de Itens Virtuais RPG. O saldo de moedas de ouro foi estendido no perfil do cliente (`ProgressoCliente`), alimentado em uma proporção de 1:1 com o ganho de XP (ao fechar atendimentos ou obter medalhas). Foram criados endpoints protegidos por JWT para listar catálogo, comprar itens, equipar e desequipar cosméticos (Molduras, Fundos e Efeitos).

## Arquivos Modificados/Criados
- [MOD] [backend/cmd/api/main.go](file:///home/mark/Dev/ruivobarber/backend/cmd/api/main.go)
- [MOD] [backend/cmd/api/schema.sql](file:///home/mark/Dev/ruivobarber/backend/cmd/api/schema.sql)
- [MOD] [backend/internal/core/domain/cliente.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/domain/cliente.go)
- [MOD] [backend/internal/adapters/repositories/cliente_pg_repository.go](file:///home/mark/Dev/ruivobarber/backend/internal/adapters/repositories/cliente_pg_repository.go)
- [MOD] [scripts/init.sql](file:///home/mark/Dev/ruivobarber/scripts/init.sql)
- [NEW] [backend/internal/core/domain/store.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/domain/store.go)
- [NEW] [backend/internal/core/ports/store_repository.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/ports/store_repository.go)
- [NEW] [backend/internal/adapters/repositories/store_pg_repository.go](file:///home/mark/Dev/ruivobarber/backend/internal/adapters/repositories/store_pg_repository.go)
- [NEW] [backend/internal/core/services/store_service.go](file:///home/mark/Dev/ruivobarber/backend/internal/core/services/store_service.go)
- [NEW] [backend/internal/adapters/handlers/store_handler.go](file:///home/mark/Dev/ruivobarber/backend/internal/adapters/handlers/store_handler.go)
- [NEW] [scripts/test_store.sh](file:///home/mark/Dev/ruivobarber/scripts/test_store.sh)

## Como Validar / Testar
Execute o script de testes de integração na raiz do projeto:
```bash
./scripts/test_store.sh
```

## Verificação dos Requisitos (.antigravityrules)
- [x] Lógica de negócio isolada em `internal/core/services` no backend? (Implementada em `store_service.go`)
- [x] Interfaces/ports criadas ou atualizadas antes da implementação de adaptadores? (Definida em `store_repository.go`)
- [x] Nomenclatura em português e rotas REST em letras minúsculas?
