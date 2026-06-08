#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DE VALIDAÇÃO DE CUPONS (ADMIN) ====="

# 1. Limpar dados anteriores
db_exec "DELETE FROM Cupons WHERE codigo IN ('TESTVAL-OK', 'TESTVAL-EXP', 'TESTVAL-USADO');"
db_exec "DELETE FROM Usuarios WHERE login = 'test_val_cli';"

# 2. Inserir Cliente de Teste
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Validar Cupom', 'Cliente', 'test_val_cli', 'pwd');"
CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_val_cli';")

# 3. Inserir cupons de teste no banco
# Cupom 1: Válido e ativo
db_exec "INSERT INTO Cupons (codigo, descricao, descontopercent, clienteid, usado, validoate) VALUES ('TESTVAL-OK', 'Cupom de Teste Ativo', 10.00, $CLI_ID, FALSE, NOW() + INTERVAL '30 days');"

# Cupom 2: Expirado
db_exec "INSERT INTO Cupons (codigo, descricao, descontopercent, clienteid, usado, validoate) VALUES ('TESTVAL-EXP', 'Cupom de Teste Expirado', 10.00, $CLI_ID, FALSE, NOW() - INTERVAL '1 day');"

# Cupom 3: Já utilizado
db_exec "INSERT INTO Cupons (codigo, descricao, descontopercent, clienteid, usado, validoate) VALUES ('TESTVAL-USADO', 'Cupom de Teste Já Usado', 10.00, $CLI_ID, TRUE, NOW() + INTERVAL '30 days');"

echo "Massa de testes de cupons inserida."

# -------------------------------------------------------------
# TESTE 1: Validar Cupom Válido (Sucesso esperado)
# -------------------------------------------------------------
echo "Executando Teste 1: Validar cupom ativo..."
RESP1=$(curl -s -X POST -H "Content-Type: application/json" -d '{"codigo": "TESTVAL-OK"}' "$API_URL/api/v1/cupons/validar")
echo "Resposta: $RESP1"

CUPOM_USADO=$(db_exec "SELECT usado FROM Cupons WHERE codigo='TESTVAL-OK';")

if [ "$CUPOM_USADO" == "t" ]; then
    echo "✔ TESTE 1 PASSOU: Cupom validado e invalidado com sucesso (usado=TRUE)."
else
    echo "✘ TESTE 1 FALHOU! O cupom não foi marcado como usado."
    exit 1
fi

# -------------------------------------------------------------
# TESTE 2: Validar Cupom já Utilizado (Erro esperado)
# -------------------------------------------------------------
echo "Executando Teste 2: Validar cupom já utilizado (Erro esperado)..."
RESP2=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d '{"codigo": "TESTVAL-USADO"}' "$API_URL/api/v1/cupons/validar")

echo "Resultados Teste 2 - HTTP Code (esperado 400): $RESP2"

if [ "$RESP2" -eq 400 ]; then
    echo "✔ TESTE 2 PASSOU: Bloqueio de cupom utilizado funcionou."
else
    echo "✘ TESTE 2 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 3: Validar Cupom Expirado (Erro esperado)
# -------------------------------------------------------------
echo "Executando Teste 3: Validar cupom expirado (Erro esperado)..."
RESP3=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d '{"codigo": "TESTVAL-EXP"}' "$API_URL/api/v1/cupons/validar")

echo "Resultados Teste 3 - HTTP Code (esperado 400): $RESP3"

if [ "$RESP3" -eq 400 ]; then
    echo "✔ TESTE 3 PASSOU: Bloqueio de cupom expirado funcionou."
else
    echo "✘ TESTE 3 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 4: Validar Cupom Inexistente (Erro esperado)
# -------------------------------------------------------------
echo "Executando Teste 4: Validar cupom inexistente (Erro esperado)..."
RESP4=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d '{"codigo": "TESTVAL-NADA"}' "$API_URL/api/v1/cupons/validar")

echo "Resultados Teste 4 - HTTP Code (esperado 404): $RESP4"

if [ "$RESP4" -eq 404 ]; then
    echo "✔ TESTE 4 PASSOU: Bloqueio de cupom inexistente funcionou."
else
    echo "✘ TESTE 4 FALHOU!"
    exit 1
fi

echo "===== TODOS OS TESTES DE VALIDAÇÃO DE CUPONS PASSARAM COM SUCESSO ====="
