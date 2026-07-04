# Checklist Operacional de Pós-Deploy (Smoke Tests)

Este checklist deve ser executado rigorosamente logo após a injeção das credenciais (`MERCADO_PAGO_ACCESS_TOKEN`, `SENTRY_DSN`, `VITE_SENTRY_DSN`, `DISCORD_WEBHOOK_URL`) em ambiente remoto de homologação ou produção.

## 1. Mercado Pago Sandbox
- [ ] Gerar cobrança PIX via fluxo de Checkout no PDV.
- [ ] Validar renderização do QR Code no frontend.
- [ ] Validar payload do copia-e-cola gerado corretamente.
- [ ] Validar recebimento do Webhook de confirmação de pagamento.
- [ ] Validar transição do status do Agendamento/Venda para `approved` após confirmação simulada.

## 2. Sentry Backend
- [ ] Disparar um erro controlado via endpoint de testes ou manipulando dados inválidos em rota autenticada.
- [ ] Validar a captura instantânea do erro no painel do Sentry Cloud.
- [ ] Validar se as tags `tenant_id` e `request_id` estão anexadas ao contexto do erro capturado.

## 3. Sentry Frontend
- [ ] Simular um erro no React (ex: disparar um `throw new Error()` forçado na UI) para acionar o `ErrorBoundary`.
- [ ] Validar a captura instantânea do erro no painel do Sentry Cloud.
- [ ] Validar se as tags `tenant_id` e `user_id` estão presentes na stacktrace capturada.

## 4. Discord
- [ ] Validar recebimento do alerta de boot (Aviso de "Sistema Iniciado / API Online") no canal configurado.
- [ ] Forçar falha repetitiva em processamento assíncrono para enviar evento para a Dead Letter Queue (DLQ).
- [ ] Validar recebimento do alerta de erro crítico (DLQ) no canal de devops/monitoramento do Discord.

---

## 5. Critério Final de Avaliação

- Se TODOS os testes acima passarem:
  ✅ **GO FOR PRODUCTION**

- Se QUALQUER teste crucial falhar (especialmente bloqueios de conversão financeira ou ausência total de logs em falhas):
  ❌ **ROLLBACK** (Recuar deploy, sanar ausência de chaves ou corrigir injeção no CI/CD e tentar novamente).
