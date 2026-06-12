#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE INTEGRADO DO ASSISTENTE DE CHAT (TASK 29) ====="

# 1. Certificar que o cliente demo existe no banco
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_chat_cli');"
db_exec "DELETE FROM Usuarios WHERE login = 'test_chat_cli';"
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Test Chat Client', 'Cliente', 'test_chat_cli', 'pwd');"
CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_chat_cli';")
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI_ID, 120, 2, 40.0);"

# 2. Obter Token JWT para o cliente
echo "Autenticando cliente..."
AUTH_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_chat_cli", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "✘ Falha ao autenticar o cliente no backend."
  exit 1
fi
echo "Autenticado com sucesso. Token obtido."

# 3. Testar endpoint de chat em streaming (SSE)
echo "Enviando prompt ao assistente virtual: 'Quais serviços vocês oferecem?'"
CHAT_RESP=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Quais serviços vocês oferecem?", "history": []}' \
  "$API_URL/api/v1/chat/stream")

echo "===== RESPOSTA RECEBIDA DO SSE CHAT ====="
echo "$CHAT_RESP"
echo "========================================="

# 4. Validar formato da resposta SSE
if echo "$CHAT_RESP" | grep -q "data:" && echo "$CHAT_RESP" | grep -q "Corte" && echo "$CHAT_RESP" | grep -q "Simples"; then
  echo "✔ TESTE PASSOU: O assistente de chat transmitiu a lista de serviços via Server-Sent Events com sucesso!"
else
  echo "✘ TESTE FALHOU: O formato do SSE ou os dados dinâmicos de serviços não foram encontrados."
  exit 1
fi

echo "===== TESTE DO ASSISTENTE DE CHAT CONCLUÍDO COM SUCESSO ====="
