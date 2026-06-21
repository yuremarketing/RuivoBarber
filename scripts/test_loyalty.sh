#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DE LEALDADE (DAILY CHECK-IN / STREAK) ====="

# 1. Limpar dados anteriores de teste
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_loyalty_cli');"
db_exec "DELETE FROM Usuarios WHERE login = 'test_loyalty_cli';"

# 2. Inserir Cliente de Teste
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Lealdade', 'Cliente', 'test_loyalty_cli', 'pwd');"
CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_loyalty_cli';")

echo "Cliente de teste criado com ID: $CLI_ID"

# 3. Obter Token JWT para o Cliente de Teste

AUTH_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_loyalty_cli", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "❌ Falha ao obter token JWT de teste!"
    echo "Resposta: $AUTH_RESP"
    exit 1
fi

echo "Token JWT obtido com sucesso."

# -------------------------------------------------------------
# TESTE 1: Primeiro Check-In (deve criar registro, dar 10 XP e 10 Moedas, Streak=1)
# -------------------------------------------------------------
echo "Executando Teste 1: primeiro check-in..."
RESP1=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$API_URL/api/v1/loyalty/checkin")
echo "Resposta do check-in: $RESP1"

STREAK1=$(echo "$RESP1" | jq -r '.streakAtual')
XP_GANHADO1=$(echo "$RESP1" | jq -r '.xpGanhado')
MOEDAS_GANHADAS1=$(echo "$RESP1" | jq -r '.moedasGanhadas')

XP_BANCO1=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
MOEDAS_BANCO1=$(db_exec "SELECT moedas FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
STREAK_BANCO1=$(db_exec "SELECT streakatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")

if [ "$STREAK1" -eq 1 ] && [ "$XP_GANHADO1" -eq 10 ] && [ "$MOEDAS_GANHADAS1" -eq 10 ] && \
   [ "$XP_BANCO1" -eq 10 ] && [ "$MOEDAS_BANCO1" -eq 10 ] && [ "$STREAK_BANCO1" -eq 1 ]; then
    echo "✔ TESTE 1 PASSOU: Primeiro check-in realizado com sucesso."
else
    echo "✘ TESTE 1 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 2: Check-In Duplicado no mesmo dia (deve retornar 400 com erro)
# -------------------------------------------------------------
echo "Executando Teste 2: tentativa de check-in duplicado..."
RESP2=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$API_URL/api/v1/loyalty/checkin")

if [ "$RESP2" -eq 400 ]; then
    echo "✔ TESTE 2 PASSOU: Check-in duplicado retornou HTTP 400."
else
    echo "✘ TESTE 2 FALHOU! Retornou HTTP $RESP2 em vez de 400."
    exit 1
fi

# -------------------------------------------------------------
# TESTE 3: Check-In Consecutivo (simular ontem, deve dar 10 XP e Moedas, Streak=2)
# -------------------------------------------------------------
echo "Executando Teste 3: check-in consecutivo..."
# Ajustar último check-in para ontem no banco
db_exec "UPDATE ProgressoCliente SET ultimocheckin = NOW() - INTERVAL '1 day' WHERE clienteid=$CLI_ID;"

RESP3=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$API_URL/api/v1/loyalty/checkin")
echo "Resposta do check-in: $RESP3"

STREAK3=$(echo "$RESP3" | jq -r '.streakAtual')
XP_GANHADO3=$(echo "$RESP3" | jq -r '.xpGanhado')

XP_BANCO3=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
MOEDAS_BANCO3=$(db_exec "SELECT moedas FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
STREAK_BANCO3=$(db_exec "SELECT streakatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")

if [ "$STREAK3" -eq 2 ] && [ "$XP_GANHADO3" -eq 10 ] && \
   [ "$XP_BANCO3" -eq 20 ] && [ "$MOEDAS_BANCO3" -eq 20 ] && [ "$STREAK_BANCO3" -eq 2 ]; then
    echo "✔ TESTE 3 PASSOU: Check-in consecutivo incrementou streak para 2."
else
    echo "✘ TESTE 3 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 4: Quebra de Streak (simular 3 dias atrás, deve dar 10 XP e Moedas, Streak=1)
# -------------------------------------------------------------
echo "Executando Teste 4: quebra de streak..."
# Ajustar último check-in para 3 dias atrás no banco
db_exec "UPDATE ProgressoCliente SET ultimocheckin = NOW() - INTERVAL '3 days' WHERE clienteid=$CLI_ID;"

RESP4=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$API_URL/api/v1/loyalty/checkin")
echo "Resposta do check-in: $RESP4"

STREAK4=$(echo "$RESP4" | jq -r '.streakAtual')
XP_GANHADO4=$(echo "$RESP4" | jq -r '.xpGanhado')

XP_BANCO4=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
MOEDAS_BANCO4=$(db_exec "SELECT moedas FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
STREAK_BANCO4=$(db_exec "SELECT streakatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")

if [ "$STREAK4" -eq 1 ] && [ "$XP_GANHADO4" -eq 10 ] && \
   [ "$XP_BANCO4" -eq 30 ] && [ "$MOEDAS_BANCO4" -eq 30 ] && [ "$STREAK_BANCO4" -eq 1 ]; then
    echo "✔ TESTE 4 PASSOU: Quebra de streak reiniciou o streak para 1."
else
    echo "✘ TESTE 4 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 5: Bônus do 7º Dia Consecutivo (Streak=7, deve dar 50 XP e Moedas (10 base + 40 bônus))
# -------------------------------------------------------------
echo "Executando Teste 5: bônus do 7º dia consecutivo..."
# Ajustar streak atual para 6 e último check-in para ontem no banco
db_exec "UPDATE ProgressoCliente SET streakatual = 6, ultimocheckin = NOW() - INTERVAL '1 day' WHERE clienteid=$CLI_ID;"

RESP5=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$API_URL/api/v1/loyalty/checkin")
echo "Resposta do check-in: $RESP5"

STREAK5=$(echo "$RESP5" | jq -r '.streakAtual')
XP_GANHADO5=$(echo "$RESP5" | jq -r '.xpGanhado')
MOEDAS_GANHADAS5=$(echo "$RESP5" | jq -r '.moedasGanhadas')

XP_BANCO5=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
MOEDAS_BANCO5=$(db_exec "SELECT moedas FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
STREAK_BANCO5=$(db_exec "SELECT streakatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")

if [ "$STREAK5" -eq 7 ] && [ "$XP_GANHADO5" -eq 50 ] && [ "$MOEDAS_GANHADAS5" -eq 50 ] && \
   [ "$XP_BANCO5" -eq 80 ] && [ "$MOEDAS_BANCO5" -eq 80 ] && [ "$STREAK_BANCO5" -eq 7 ]; then
    echo "✔ TESTE 5 PASSOU: Bônus de 7 dias consecutivos concedido (+50 XP e Moedas)."
else
    echo "✘ TESTE 5 FALHOU!"
    exit 1
fi

# Limpar dados após os testes
db_exec "DELETE FROM ProgressoCliente WHERE clienteid = $CLI_ID;"
db_exec "DELETE FROM Usuarios WHERE id = $CLI_ID;"

echo "===== TODOS OS TESTES DE LEALDADE PASSARAM COM SUCESSO ====="
