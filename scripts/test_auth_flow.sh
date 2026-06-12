#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DOS FLUXOS DE AUTENTICAÇÃO (CADASTRO & GOOGLE) ====="

# 1. Limpar registros anteriores de teste
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('pub_cli_test', 'joao.silva@gmail.com'));"
db_exec "DELETE FROM Usuarios WHERE login IN ('pub_cli_test', 'joao.silva@gmail.com');"

# 2. Testar o cadastro público de clientes
echo "[+] Testando POST /api/v1/auth/register (Cadastro Público)..."
REG_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"nome": "Cliente Publico Test", "login": "pub_cli_test", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/register")

echo "Resposta Cadastro: $REG_RESP"

TOKEN=$(echo "$REG_RESP" | jq -r '.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "✘ TESTE FALHOU: Cadastro público de clientes não retornou um token JWT válido."
  exit 1
fi
echo "✔ Cadastro público com login automático concluído com sucesso!"

# 3. Testar o login do Google Simulado
echo "[+] Testando POST /api/v1/auth/google (Google Sign-In Simulado)..."
GOOGLE_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"credential": "mock_google_joao.silva@gmail.com"}' \
  "$API_URL/api/v1/auth/google")

echo "Resposta Google: $GOOGLE_RESP"

GOOGLE_TOKEN=$(echo "$GOOGLE_RESP" | jq -r '.token')
if [ -z "$GOOGLE_TOKEN" ] || [ "$GOOGLE_TOKEN" == "null" ]; then
  echo "✘ TESTE FALHOU: Login social do Google simulado não retornou um token JWT válido."
  exit 1
fi
echo "✔ Login com o Google (Cadastro/Login Automático) concluído com sucesso!"

# 4. Validar persistência no banco de dados
echo "[+] Verificando registros no banco de dados..."
CLI_PUB_COUNT=$(db_exec "SELECT COUNT(*) FROM Usuarios WHERE login='pub_cli_test';")
CLI_GGL_COUNT=$(db_exec "SELECT COUNT(*) FROM Usuarios WHERE login='joao.silva@gmail.com';")

if [ "$CLI_PUB_COUNT" -eq 1 ] && [ "$CLI_GGL_COUNT" -eq 1 ]; then
  echo "✔ Ambas as contas foram criadas e persistidas com sucesso no banco de dados!"
else
  echo "✘ TESTE FALHOU: Falha de persistência no PostgreSQL."
  exit 1
fi

echo "===== TODOS OS TESTES DE AUTENTICAÇÃO PASSARAM COM SUCESSO! ====="
