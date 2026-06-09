#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DE RESGATE DE CUPONS (RPG) ====="

# 1. Limpar dados anteriores
db_exec "DELETE FROM Cupons WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_coupon_cli');"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_coupon_cli');"
db_exec "DELETE FROM Usuarios WHERE login = 'test_coupon_cli';"

# 2. Inserir Cliente de Teste
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Cupom RPG', 'Cliente', 'test_coupon_cli', 'pwd');"
CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_coupon_cli';")

# 3. Definir progresso inicial: 500 XP (Nível 2 atingido, Nível 3 precisa de 600 XP)
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI_ID, 500, 2, 83.33);"

echo "Criado Cliente ID: $CLI_ID com 500 XP."

# Obter Token JWT do Cliente para autenticação
AUTH_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_coupon_cli", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')

# -------------------------------------------------------------
# TESTE 1: Resgatar Cupom de Nível 2 (Elegível - Custo: 300 XP)
# -------------------------------------------------------------
echo "Executando Teste 1: Resgatar cupom de Nível 2 (Sucesso esperado)..."
RESP1=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"cliente_id\": $CLI_ID, \"nivel_id\": 2}" "$API_URL/api/v1/cupons/resgatar")
echo "Resposta: $RESP1"

CUPOM_COUNT=$(db_exec "SELECT COUNT(*) FROM Cupons WHERE clienteid=$CLI_ID AND descontopercent=5.00;")
CODIGO_CUPOM=$(echo "$RESP1" | grep -o '"codigo":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ "$CUPOM_COUNT" -eq 1 ] && [ -n "$CODIGO_CUPOM" ]; then
    echo "✔ TESTE 1 PASSOU: Cupom resgatado com sucesso! Código: $CODIGO_CUPOM"
else
    echo "✘ TESTE 1 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 2: Tentar resgatar o mesmo nível novamente (Duplicado)
# -------------------------------------------------------------
echo "Executando Teste 2: Tentar resgatar Nível 2 novamente (Erro esperado)..."
RESP2=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"cliente_id\": $CLI_ID, \"nivel_id\": 2}" "$API_URL/api/v1/cupons/resgatar")

echo "Resultados Teste 2 - HTTP Code (esperado 400): $RESP2"

if [ "$RESP2" -eq 400 ]; then
    echo "✔ TESTE 2 PASSOU: Bloqueio de duplicidade funcionou corretamente."
else
    echo "✘ TESTE 2 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 3: Tentar resgatar Nível 3 (XP Insuficiente: 500/600)
# -------------------------------------------------------------
echo "Executando Teste 3: Tentar resgatar Nível 3 (XP Insuficiente - Erro esperado)..."
RESP3=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"cliente_id\": $CLI_ID, \"nivel_id\": 3}" "$API_URL/api/v1/cupons/resgatar")

echo "Resultados Teste 3 - HTTP Code (esperado 400): $RESP3"

if [ "$RESP3" -eq 400 ]; then
    echo "✔ TESTE 3 PASSOU: Bloqueio por XP insuficiente funcionou corretamente."
else
    echo "✘ TESTE 3 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 4: Tentar resgatar Nível 1 (Iniciante - Sem recompensa)
# -------------------------------------------------------------
echo "Executando Teste 4: Tentar resgatar Nível 1 (Sem recompensa - Erro esperado)..."
RESP4=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"cliente_id\": $CLI_ID, \"nivel_id\": 1}" "$API_URL/api/v1/cupons/resgatar")

echo "Resultados Teste 4 - HTTP Code (esperado 400): $RESP4"

if [ "$RESP4" -eq 400 ]; then
    echo "✔ TESTE 4 PASSOU: Nível inicial sem bônus bloqueado corretamente."
else
    echo "✘ TESTE 4 FALHOU!"
    exit 1
fi

echo "===== TODOS OS TESTES DE RESGATE DE CUPONS PASSARAM COM SUCESSO ====="
