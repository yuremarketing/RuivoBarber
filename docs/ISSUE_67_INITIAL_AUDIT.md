# Auditoria Inicial: Issue #67 (Observabilidade)

## Cenário Atual (Baseline)
O projeto "RuivoBarber" encontra-se no estado inicial de preparação para o piloto. Com a infraestrutura assíncrona (workers e webhooks) em pleno funcionamento (concluída na Issue #66), os requisitos de observabilidade tornam-se essenciais para garantir rastreabilidade em produção.

Abaixo estão os resultados da auditoria estrutural baseada no código atual (`HEAD` = `8c9d16c`):

### 1. Logs (Logging)
- **Status:** Básico (Standard `log` package).
- **Encontrado:** Chamadas de `log.Printf` e `log.Println` espalhadas por `main.go`, `rpg_processor.go` e handlers (ex: `[RPG_PROCESSOR]`, `[RECOVER]`, `[DLQ]`).
- **Problema:** Logs não estruturados (não em JSON) tornam impossível a indexação eficiente por ferramentas como ElasticSearch/Datadog. Níveis de severidade (INFO, WARN, ERROR) são strings inseridas manualmente no texto.

### 2. Métricas e Monitoramento
- **Status:** Inexistente.
- **Encontrado:** Nenhum endpoint `/metrics` do Prometheus exposto. Não existem métricas customizadas de negócio (ex: *taxa de aprovação PIX*, *latência de requisição*, *tamanho da fila do outbox*, *tentativas de worker*).
- **Problema:** O piloto será operado às cegas sem um dashboard operacional de saúde (Grafana).

### 3. Rastreamento (Tracing/APM)
- **Status:** Inexistente.
- **Encontrado:** O `context.Context` é passado adequadamente entre requests e BD (como no `BeginTx(ctx)`), mas **nenhum** correlation ID ou trace ID (`OpenTelemetry` ou `X-Request-ID`) é gerado na ponta web e repassado aos serviços.
- **Problema:** Se um pagamento via Webhook falhar, é difícil rastrear o path exato da requisição de ponta a ponta.

### 4. Gestão de Erros
- **Status:** Intermediário.
- **Encontrado:** Erros são retornados nativamente no Go (`fmt.Errorf`) e interceptados localmente. O Worker possui mecanismos isolados de *Panic Recover*.
- **Problema:** Ausência de integração com plataformas como Sentry, Datadog APM ou Rollbar para detecção automática de anomalias e agrupamento de stack traces em tempo real.

### 5. Healthchecks
- **Status:** Inexistente.
- **Encontrado:** Não há uma rota explícita de `GET /health` ou `GET /ready` no `fiber.App` (main.go). 
- **Problema:** Orquestradores de container (Docker/K8s) não podem aferir de modo confiável se a base de dados Postgres está viva e se a API está pronta para receber tráfego.

## Proposta de Escopo para a Issue #67
Para solucionar as falhas auditadas, a execução deve contemplar:
1. Substituir o `log` padrão por um logger estruturado (ZeroLog, Zap ou Logrus).
2. Adicionar Middleware gerador de `X-Request-ID` e injeção do trace no contexto.
3. Criar rotas `/health` e `/ready` (Ping DB).
4. (Opcional) Instrumentação básica de Prometheus para Fiber e Database.
5. Captura automática de `panic()` de rotas subindo diretamente para logs centralizados / Sentry.
