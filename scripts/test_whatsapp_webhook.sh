#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DO WEBHOOK WHATSAPP & CONFIGURAÇÕES (TASK #39) ====="

# 1. Preparar massa de testes
db_exec "DELETE FROM MensagensProcessadas;"
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = '5511999999999');"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = '5511999999999');"
db_exec "DELETE FROM Usuarios WHERE login = '5511999999999';"
db_exec "DELETE FROM Configuracoes;"

# Inserir Cliente de Teste cujo Login é o seu número do WhatsApp (ex: 5511999999999)
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente WhatsApp Teste', 'Cliente', '5511999999999', 'pwd');"
CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='5511999999999';")
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI_ID, 150, 2, 50.00);"

# Obter Token JWT do Administrador para configurar a API
db_exec "DELETE FROM Usuarios WHERE login = 'test_admin_wa';"
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Test Admin WA', 'Adm', 'test_admin_wa', 'pwd');"
AUTH_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_admin_wa", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
ADMIN_TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')

echo "Massa de testes preparada."

# -------------------------------------------------------------
# TESTE 1: Salvar Configurações via API Admin
# -------------------------------------------------------------
echo "Executando Teste 1: Salvar configurações via API..."
CFG_RESP=$(curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"chaveApiWhatsapp": "KEY_MOCK_XYZ", "urlWebhook": "https://callback.mybarber.com", "tokenValidacao": "TOKEN_SECURE_123"}' \
  "$API_URL/api/v1/configuracoes")

echo "Resposta de Configurações: $CFG_RESP"
CHAVE_SALVA=$(db_exec "SELECT ChaveAPIWhatsApp FROM Configuracoes LIMIT 1;")
TOKEN_SALVO=$(db_exec "SELECT TokenValidacao FROM Configuracoes LIMIT 1;")

if [ "$CHAVE_SALVA" == "KEY_MOCK_XYZ" ] && [ "$TOKEN_SALVO" == "TOKEN_SECURE_123" ]; then
    echo "✔ TESTE 1 PASSOU: Configurações persistidas com sucesso."
else
    echo "✘ TESTE 1 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 2: Handshake / Verificação de Webhook (GET)
# -------------------------------------------------------------
echo "Executando Teste 2: Handshake de Verificação do Webhook (GET)..."
HANDSHAKE_RESP=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_URL/api/v1/webhook/whatsapp?hub.mode=subscribe&hub.challenge=HELLO_CHALLENGE_123&hub.verify_token=TOKEN_SECURE_123")

HANDSHAKE_STATUS=$(echo "$HANDSHAKE_RESP" | tail -n1)
HANDSHAKE_BODY=$(echo "$HANDSHAKE_RESP" | head -n-1)

echo "Status HTTP Handshake (esperado 200): $HANDSHAKE_STATUS"
echo "Corpo Handshake (esperado HELLO_CHALLENGE_123): $HANDSHAKE_BODY"

if [ "$HANDSHAKE_STATUS" == "200" ] && [ "$HANDSHAKE_BODY" == "HELLO_CHALLENGE_123" ]; then
    echo "✔ TESTE 2.1 PASSOU: Handshake validado com sucesso."
else
    echo "✘ TESTE 2.1 FALHOU!"
    exit 1
fi

# Teste com token inválido
HANDSHAKE_INVALID=$(curl -s -w "\n%{http_code}" -X GET \
  "$API_URL/api/v1/webhook/whatsapp?hub.mode=subscribe&hub.challenge=HELLO_CHALLENGE_123&hub.verify_token=WRONG_TOKEN")

HANDSHAKE_INVALID_STATUS=$(echo "$HANDSHAKE_INVALID" | tail -n1)
echo "Status HTTP Handshake Token Inválido (esperado 403): $HANDSHAKE_INVALID_STATUS"

if [ "$HANDSHAKE_INVALID_STATUS" == "403" ]; then
    echo "✔ TESTE 2.2 PASSOU: Rejeição de handshake inválido OK."
else
    echo "✘ TESTE 2.2 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 3: Segurança de Acesso POST (Rejeitar Token Inválido)
# -------------------------------------------------------------
echo "Executando Teste 3: Segurança do Webhook POST..."
POST_UNAUTH=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"message_id": "msg_001", "sender": "5511999999999", "message": "Quais os serviços?"}' \
  "$API_URL/api/v1/webhook/whatsapp?token=WRONG_TOKEN")

POST_UNAUTH_STATUS=$(echo "$POST_UNAUTH" | tail -n1)
echo "Status HTTP POST não autorizado (esperado 401): $POST_UNAUTH_STATUS"

if [ "$POST_UNAUTH_STATUS" == "401" ]; then
    echo "✔ TESTE 3 PASSOU: Chamada não autenticada rejeitada com sucesso."
else
    echo "✘ TESTE 3 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 4: Envio de Mensagem Válida e Processamento do Chatbot
# -------------------------------------------------------------
echo "Executando Teste 4: Envio de mensagem válida via webhook..."
POST_OK=$(curl -s -w "\n%{http_code}" -X POST \
  -H "X-WhatsApp-Token: TOKEN_SECURE_123" \
  -H "Content-Type: application/json" \
  -d '{"message_id": "msg_001", "sender": "5511999999999", "message": "quais os servicos?"}' \
  "$API_URL/api/v1/webhook/whatsapp")

POST_OK_STATUS=$(echo "$POST_OK" | tail -n1)
POST_OK_BODY=$(echo "$POST_OK" | head -n-1)

echo "Status HTTP POST Válido (esperado 200): $POST_OK_STATUS"
echo "Corpo de Resposta: $POST_OK_BODY"

if [ "$POST_OK_STATUS" == "200" ] && echo "$POST_OK_BODY" | grep -q "Corte Simples"; then
    echo "✔ TESTE 4 PASSOU: Chatbot processou a intenção e listou os serviços com sucesso."
else
    echo "✘ TESTE 4 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 5: Idempotência (Mensagem Duplicada)
# -------------------------------------------------------------
echo "Executando Teste 5: Verificação de Idempotência (MessageID msg_001 repetido)..."
POST_DUP=$(curl -s -w "\n%{http_code}" -X POST \
  -H "X-WhatsApp-Token: TOKEN_SECURE_123" \
  -H "Content-Type: application/json" \
  -d '{"message_id": "msg_001", "sender": "5511999999999", "message": "quais os servicos?"}' \
  "$API_URL/api/v1/webhook/whatsapp")

POST_DUP_STATUS=$(echo "$POST_DUP" | tail -n1)
POST_DUP_BODY=$(echo "$POST_DUP" | head -n-1)

echo "Status HTTP Mensagem Duplicada (esperado 200): $POST_DUP_STATUS"
echo "Corpo Mensagem Duplicada (esperado vazio ou sem resposta): $POST_DUP_BODY"

if [ "$POST_DUP_STATUS" == "200" ] && echo "$POST_DUP_BODY" | grep -q "duplicada_ignorada"; then
    echo "✔ TESTE 5 PASSOU: Mensagem duplicada ignorada com sucesso (idempotência OK)."
else
    echo "✘ TESTE 5 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 6: Validação de Function Calling (Criação de Agendamento via Chatbot)
# -------------------------------------------------------------
echo "Executando Teste 6: Criação de agendamento via simulador síncrono (Function Calling)..."
POST_SCHED=$(curl -s -w "\n%{http_code}" -X POST \
  -H "X-WhatsApp-Token: TOKEN_SECURE_123" \
  -H "Content-Type: application/json" \
  -d '{"message_id": "msg_002", "sender": "5511999999999", "message": "Quero marcar corte simples com carlos dia 2026-06-25 às 15:00"}' \
  "$API_URL/api/v1/webhook/whatsapp")

POST_SCHED_STATUS=$(echo "$POST_SCHED" | tail -n1)
POST_SCHED_BODY=$(echo "$POST_SCHED" | head -n-1)

echo "Status HTTP Agendamento Chatbot (esperado 200): $POST_SCHED_STATUS"
echo "Resposta Chatbot: $POST_SCHED_BODY"

AG_COUNT=$(db_exec "SELECT COUNT(*) FROM Agendamentos WHERE clienteid = $CLI_ID AND servicoid = 1;")
echo "Quantidade de agendamentos criados via chatbot: $AG_COUNT"

if [ "$POST_SCHED_STATUS" == "200" ] && [ "$AG_COUNT" -eq 1 ]; then
    echo "✔ TESTE 6 PASSOU: Agendamento criado via chatbot simulado com sucesso."
else
    echo "✘ TESTE 6 FALHOU!"
    exit 1
fi

# Limpar Admin de teste
db_exec "DELETE FROM Usuarios WHERE login = 'test_admin_wa';"

echo "===== TODOS OS TESTES DO WEBHOOK E CONFIGURAÇÕES PASSARAM COM SUCESSO ====="
