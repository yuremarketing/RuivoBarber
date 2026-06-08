#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DE NO-SHOW PENALTY (DEDUÇÃO DE 100 XP) ====="

# 1. Limpar dados anteriores
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('test_ns_cli1', 'test_ns_cli2', 'test_ns_cli3'));"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('test_ns_cli1', 'test_ns_cli2', 'test_ns_cli3'));"
db_exec "DELETE FROM Usuarios WHERE login IN ('test_ns_cli1', 'test_ns_cli2', 'test_ns_cli3');"

# 2. Inserir Clientes de Teste
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente NS 1', 'Cliente', 'test_ns_cli1', 'pwd');"
CLI1_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_ns_cli1';")

db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente NS 2', 'Cliente', 'test_ns_cli2', 'pwd');"
CLI2_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_ns_cli2';")

db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente NS 3', 'Cliente', 'test_ns_cli3', 'pwd');"
CLI3_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_ns_cli3';")

# 3. Definir progresso inicial para os clientes
# Cliente 1 começa com 150 XP (Nível 2 / Barba de Respeito)
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI1_ID, 150, 2, 50.00);"
# Cliente 2 começa com 50 XP (Nível 1 / Corte Iniciante)
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI2_ID, 50, 1, 50.00);"
# Cliente 3 começa com 200 XP
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI3_ID, 200, 2, 66.67);"

# 4. Criar Agendamentos
BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE cargo='Barbeiro' LIMIT 1;")
if [ -z "$BARBEIRO_ID" ]; then
    db_exec "INSERT INTO Usuarios (nome, cargo, login, senha, comissao) VALUES ('Barbeiro Test', 'Barbeiro', 'test_ns_barb', 'pwd', 30.00);"
    BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_ns_barb';")
fi

# Agendamento 1 para Cliente 1 (Status Confirmado -> Deve deduzir 100 XP e cair de nível)
db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI1_ID, $BARBEIRO_ID, 1, NOW() + INTERVAL '1 hour', 'Confirmado');"
AGEN1_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI1_ID ORDER BY id DESC LIMIT 1;")

# Agendamento 2 para Cliente 2 (Status Confirmado -> Deve deduzir 100 XP e limitar em 0)
db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI2_ID, $BARBEIRO_ID, 1, NOW() + INTERVAL '2 hours', 'Confirmado');"
AGEN2_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI2_ID ORDER BY id DESC LIMIT 1;")

# Agendamento 3 para Cliente 3 (Status Concluido -> Não deve permitir aplicar falta)
db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI3_ID, $BARBEIRO_ID, 1, NOW() + INTERVAL '3 hours', 'Concluido');"
AGEN3_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI3_ID ORDER BY id DESC LIMIT 1;")

echo "Massa de testes inserida com sucesso."
echo "Agendamento 1 (Cli 1): ID $AGEN1_ID"
echo "Agendamento 2 (Cli 2): ID $AGEN2_ID"
echo "Agendamento 3 (Cli 3): ID $AGEN3_ID"

# -------------------------------------------------------------
# TESTE 1: Registrar Falta no Agendamento 1 (150 XP -> 50 XP, Nivel 2 -> Nivel 1)
# -------------------------------------------------------------
echo "Executando Teste 1: registrar falta para Cliente 1..."
RESP1=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN1_ID}" "$API_URL/api/v1/atendimentos/falta")
echo "Resposta: $RESP1"

STATUS_AGEN1=$(db_exec "SELECT status FROM Agendamentos WHERE id=$AGEN1_ID;")
XP_CLI1=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI1_ID;")
NIVEL_CLI1=$(db_exec "SELECT nivelatual FROM ProgressoCliente WHERE clienteid=$CLI1_ID;")

echo "Resultados Teste 1 - Status: $STATUS_AGEN1, XP: $XP_CLI1, Nivel: $NIVEL_CLI1"

if [ "$STATUS_AGEN1" == "Falta" ] && [ "$XP_CLI1" -eq 50 ] && [ "$NIVEL_CLI1" -eq 1 ]; then
    echo "✔ TESTE 1 PASSOU: Falta registrada, 100 XP deduzidos e nível rebaixado."
else
    echo "✘ TESTE 1 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 2: Registrar Falta no Agendamento 2 (50 XP -> 0 XP, limitador de mínimo)
# -------------------------------------------------------------
echo "Executando Teste 2: registrar falta para Cliente 2..."
RESP2=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN2_ID}" "$API_URL/api/v1/atendimentos/falta")
echo "Resposta: $RESP2"

STATUS_AGEN2=$(db_exec "SELECT status FROM Agendamentos WHERE id=$AGEN2_ID;")
XP_CLI2=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI2_ID;")
NIVEL_CLI2=$(db_exec "SELECT nivelatual FROM ProgressoCliente WHERE clienteid=$CLI2_ID;")

echo "Resultados Teste 2 - Status: $STATUS_AGEN2, XP: $XP_CLI2, Nivel: $NIVEL_CLI2"

if [ "$STATUS_AGEN2" == "Falta" ] && [ "$XP_CLI2" -eq 0 ] && [ "$NIVEL_CLI2" -eq 1 ]; then
    echo "✔ TESTE 2 PASSOU: Falta registrada e XP limitado em 0."
else
    echo "✘ TESTE 2 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 3: Chamar falta em agendamento já finalizado (Status Concluido)
# -------------------------------------------------------------
echo "Executando Teste 3: tentar registrar falta em agendamento Concluido..."
RESP3=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN3_ID}" "$API_URL/api/v1/atendimentos/falta")

STATUS_AGEN3=$(db_exec "SELECT status FROM Agendamentos WHERE id=$AGEN3_ID;")
XP_CLI3=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI3_ID;")

echo "Resultados Teste 3 - HTTP Code (esperado 400): $RESP3, Status: $STATUS_AGEN3, XP: $XP_CLI3"

if [ "$RESP3" -eq 400 ] && [ "$STATUS_AGEN3" == "Concluido" ] && [ "$XP_CLI3" -eq 200 ]; then
    echo "✔ TESTE 3 PASSOU: Erro lançado corretamente e sem alterações nos dados."
else
    echo "✘ TESTE 3 FALHOU!"
    exit 1
fi

echo "===== TODOS OS TESTES DE NO-SHOW PENALTY PASSARAM COM SUCESSO ====="
