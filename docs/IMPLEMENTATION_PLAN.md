# 🚨 Plano de Estabilização (Força-Tarefa `develop`)

> [!WARNING]
> Este documento mapeia a Causa Raiz e o Esforço de Correção das falhas críticas encontradas durante o Piloto. Nenhuma alteração foi realizada. Aguardando aprovação para iniciar o desenvolvimento (engineering mode).

---

## P0-A – Login Multi-Tenant

**Problema:** `/auth/login` retorna `401 Unauthorized` bloqueando o acesso de todos os usuários.

### Diagnóstico
- **Arquivo:** `backend/internal/adapters/repositories/cliente_pg_repository.go`
- **Função:** `GetPasswordHashByLogin(ctx context.Context, login string)` (Linhas 142-145)
- **Stack de Execução:** `ClienteHandler.Login` -> `ClienteService.Login` -> `ClientePgRepository.GetPasswordHashByLogin`
- **Causa Raiz:** O repositório extrai estritamente o Tenant ID do contexto via `contextutils.GetTenantID(ctx)` para executar a query `SELECT senha FROM Usuarios WHERE login = $1 AND tenant_id = $2`. Como `/auth/login` é uma rota pública, ela não passa pelo `JWTMiddleware`, resultando num `context.Background()` vazio sendo passado pelo Service. A falta do Tenant ID gera erro imediato.

### Impacto e Esforço
- **Impacto:** Crítico (Sistema Inutilizável). Ninguém consegue logar.
- **Esforço de Correção:** Baixo (Tamanho P)
- **Correção Mínima Recomendada:** Refatorar a query `GetPasswordHashByLogin` para buscar a senha e o `tenant_id` **apenas** pelo `login` (assumindo login único) ou extrair o `tenant_id` no Handler (ex: via Header `X-Tenant-ID` ou Payload) e injetá-lo no `Context` antes de chamar o Service.

---

## P0-B – Migrações RPG / Outbox

**Problema:** Loop infinito de erro `pq: relation "eventos_rpg_outbox" does not exist` quebrando as features de Resiliência/Gamification.

### Diagnóstico
- **Arquivos Envolvidos:** `backend/scripts/init.sql` (Seed Inicial) e `backend/cmd/api/main.go` (Auto-Migrations).
- **Divergências Encontradas:** Não há sistema formal de migrations (pasta `migrations/` não existe). Todo o schema é garantido via script estático `init.sql` e funções de *auto-migration* hardcoded no `main.go`. Nenhuma dessas duas fontes declara a criação das tabelas `eventos_rpg_outbox` e `historico_xp`.
- **Causa Raiz:** As tabelas base para o ecossistema do RPG Worker foram completamente esquecidas durante a evolução da funcionalidade. Como o Worker roda em background e não possui rota pública associada, os testes mockados aprovaram sem que a tabela existisse no banco real.

### Impacto e Esforço
- **Impacto:** Crítico (Gamification e Retry Quebrados). O banco recusa as inserções de fila do Outbox pattern.
- **Esforço de Correção:** Baixo (Tamanho P)
- **Correção Mínima Recomendada:** Adicionar as queries `CREATE TABLE IF NOT EXISTS eventos_rpg_outbox ...` e `historico_xp` no bloco de auto-migração dentro de `backend/cmd/api/main.go` ou em `backend/scripts/init.sql`.

---

## P0-C – SSE Runtime Crash

**Problema:** `GET /api/v1/stream` dispara um panic e derruba o container Backend.

### Diagnóstico
- **Arquivo:** `backend/internal/adapters/handlers/sse_handler.go`
- **Linha:** 148 (`case <-c.Context().Done():`)
- **Stack Trace:**
  ```
  panic: runtime error: invalid memory address or nil pointer dereference
  goroutine 275 [running]:
  github.com/valyala/fasthttp.(*RequestCtx).Done(...)
          /go/pkg/mod/github.com/valyala/fasthttp@v1.57.0/server.go:2753
  ruivobarber-api/internal/adapters/handlers.(*SSEHandler).HandleStream.func1
          /app/internal/adapters/handlers/sse_handler.go:148 +0xac
  ```
- **Causa Raiz:** No Fiber v2, o context nativo (`*fiber.Ctx`) e o request context do `fasthttp` são ativamente reciclados no pool de memória assim que o ciclo de vida do request/handler primário termina. Tentar ler `<-c.Context().Done()` dentro de uma goroutine assíncrona (como o `c.Context().SetBodyStreamWriter`) referenciará um ponteiro nulo (nil pointer dereference) causando panic.

### Impacto e Esforço
- **Impacto:** Fatal (Crash do Servidor). Uma única requisição paralisa o backend inteiro.
- **Esforço de Correção:** Micro (1 linha de código)
- **Correção Mínima Recomendada:** Remover o bloco `case <-c.Context().Done():` do loop select. A detecção de desconexão já ocorrerá naturalmente e de forma segura ao checar os erros do `w.Write()` e `w.Flush()`.

---

## 🏆 Ordem de Correção Recomendada

Para restaurar o ambiente gradualmente do mais bloqueante para o menos bloqueante:

1. **P0-C (SSE Crash):** Resolver imediatamente para impedir que o backend continue "capotando" e sujando os logs. (1 linha de alteração).
2. **P0-A (Login):** Destravar o funil principal para conseguirmos acessar o painel administrativo e gerar agendamentos.
3. **P0-B (Migrações RPG):** Adicionar as tabelas esquecidas para que os testes P2P do Gamification e Resiliência possam ser validados.
