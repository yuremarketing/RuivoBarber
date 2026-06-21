#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DE PROGRESSO RPG (CÁLCULO E TRANSIÇÃO DE NÍVEIS) ====="

# 1. Limpar dados anteriores de teste
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('test_lvl_cli1', 'test_lvl_cli2', 'test_lvl_cli3', 'test_lvl_cli4'));"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('test_lvl_cli1', 'test_lvl_cli2', 'test_lvl_cli3', 'test_lvl_cli4'));"
db_exec "DELETE FROM Usuarios WHERE login IN ('test_lvl_cli1', 'test_lvl_cli2', 'test_lvl_cli3', 'test_lvl_cli4');"

# 2. Inserir Clientes de Teste
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Lvl 1-2', 'Cliente', 'test_lvl_cli1', 'pwd');"
CLI1_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_lvl_cli1';")

db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Lvl 2-3', 'Cliente', 'test_lvl_cli2', 'pwd');"
CLI2_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_lvl_cli2';")

db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Lvl 3-4', 'Cliente', 'test_lvl_cli3', 'pwd');"
CLI3_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_lvl_cli3';")

db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Lvl Max Capped', 'Cliente', 'test_lvl_cli4', 'pwd');"
CLI4_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_lvl_cli4';")

# 3. Definir progresso inicial para os clientes
# Cliente 1 começa com 280 XP (Falta 20 XP para 300 - Barba de Respeito)
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI1_ID, 280, 1, 93.33);"
# Cliente 2 começa com 580 XP (Falta 20 XP para 600 - Lenda da Navalha)
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI2_ID, 580, 2, 96.67);"
# Cliente 3 começa com 980 XP (Falta 20 XP para 1000 - Rei da Cadeira)
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI3_ID, 980, 3, 98.00);"
# Cliente 4 começa com 1050 XP (Já está no nível máximo)
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI4_ID, 1050, 4, 100.00);"

# Pre-insert badges to avoid interference from the badge system (XP bonuses)
db_exec "INSERT INTO UsuarioBadges (usuarioid, badgeid) VALUES ($CLI1_ID, 1), ($CLI1_ID, 3);"
db_exec "INSERT INTO UsuarioBadges (usuarioid, badgeid) VALUES ($CLI2_ID, 1), ($CLI2_ID, 3), ($CLI2_ID, 4);"
db_exec "INSERT INTO UsuarioBadges (usuarioid, badgeid) VALUES ($CLI3_ID, 1), ($CLI3_ID, 3), ($CLI3_ID, 4);"
db_exec "INSERT INTO UsuarioBadges (usuarioid, badgeid) VALUES ($CLI4_ID, 1), ($CLI4_ID, 3), ($CLI4_ID, 4);"



# 4. Garantir estoque de produtos para o serviço 2 (Corte + Barba, recompensa 25 XP)
db_exec "UPDATE Produtos SET quantidade = 100;"

BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE cargo='Barbeiro' LIMIT 1;")
if [ -z "$BARBEIRO_ID" ]; then
    db_exec "INSERT INTO Usuarios (nome, cargo, login, senha, comissao) VALUES ('Barbeiro Test', 'Barbeiro', 'test_lvl_barb', 'pwd', 30.00);"
    BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_lvl_barb';")
fi

# Criar agendamentos usando o serviço 2 (25 XP)
db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI1_ID, $BARBEIRO_ID, 2, NOW() + INTERVAL '1 hour', 'Confirmado');"
AGEN1_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI1_ID ORDER BY id DESC LIMIT 1;")

db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI2_ID, $BARBEIRO_ID, 2, NOW() + INTERVAL '2 hours', 'Confirmado');"
AGEN2_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI2_ID ORDER BY id DESC LIMIT 1;")

db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI3_ID, $BARBEIRO_ID, 2, NOW() + INTERVAL '3 hours', 'Confirmado');"
AGEN3_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI3_ID ORDER BY id DESC LIMIT 1;")

db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI4_ID, $BARBEIRO_ID, 2, NOW() + INTERVAL '4 hours', 'Confirmado');"
AGEN4_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI4_ID ORDER BY id DESC LIMIT 1;")

echo "Massa de testes de progresso RPG configurada com sucesso."

# Obter Token JWT do Administrador para autenticação
db_exec "DELETE FROM Usuarios WHERE login = 'test_admin';"
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Test Admin', 'Adm', 'test_admin', 'pwd');"
AUTH_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_admin", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')

# -------------------------------------------------------------
# TESTE 1: Transição do Nível 1 para Nível 2 (280 XP + 25 XP = 305 XP -> Nível 2)
# -------------------------------------------------------------
echo "Executando Teste 1: transição do Nível 1 para o Nível 2..."
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN1_ID}" "$API_URL/api/v1/atendimentos/concluir" > /dev/null

XP_CLI1=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI1_ID;")
NIVEL_CLI1=$(db_exec "SELECT nivelatual FROM ProgressoCliente WHERE clienteid=$CLI1_ID;")
PCT_CLI1=$(db_exec "SELECT barrapercentual FROM ProgressoCliente WHERE clienteid=$CLI1_ID;")

echo "Resultados Teste 1 - XP: $XP_CLI1, Nivel: $NIVEL_CLI1, Progresso: $PCT_CLI1%"

# Nível 2 é "Barba de Respeito". Com 305 XP e próximo nível 600, o percentual é: (305 / 600) * 100 = 50.83%
if [ "$XP_CLI1" -eq 305 ] && [ "$NIVEL_CLI1" -eq 2 ]; then
    echo "✔ TESTE 1 PASSOU: Cliente subiu para o Nível 2 (Barba de Respeito)."
else
    echo "✘ TESTE 1 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 2: Transição do Nível 2 para Nível 3 (580 XP + 25 XP = 605 XP -> Nível 3)
# -------------------------------------------------------------
echo "Executando Teste 2: transição do Nível 2 para o Nível 3..."
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN2_ID}" "$API_URL/api/v1/atendimentos/concluir" > /dev/null

XP_CLI2=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI2_ID;")
NIVEL_CLI2=$(db_exec "SELECT nivelatual FROM ProgressoCliente WHERE clienteid=$CLI2_ID;")

echo "Resultados Teste 2 - XP: $XP_CLI2, Nivel: $NIVEL_CLI2"

# Nível 3 é "Lenda da Navalha"
if [ "$XP_CLI2" -eq 605 ] && [ "$NIVEL_CLI2" -eq 3 ]; then
    echo "✔ TESTE 2 PASSOU: Cliente subiu para o Nível 3 (Lenda da Navalha)."
else
    echo "✘ TESTE 2 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 3: Transição do Nível 3 para Nível 4 (980 XP + 25 XP = 1005 XP -> Nível 4)
# -------------------------------------------------------------
echo "Executando Teste 3: transição do Nível 3 para o Nível 4..."
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN3_ID}" "$API_URL/api/v1/atendimentos/concluir" > /dev/null

XP_CLI3=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI3_ID;")
NIVEL_CLI3=$(db_exec "SELECT nivelatual FROM ProgressoCliente WHERE clienteid=$CLI3_ID;")
PCT_CLI3=$(db_exec "SELECT barrapercentual FROM ProgressoCliente WHERE clienteid=$CLI3_ID;")

echo "Resultados Teste 3 - XP: $XP_CLI3, Nivel: $NIVEL_CLI3, Progresso: $PCT_CLI3%"

# Nível 4 é "Rei da Cadeira" (Nível Máximo), barra percentual deve ser 100.00
if [ "$XP_CLI3" -eq 1005 ] && [ "$NIVEL_CLI3" -eq 4 ] && [ "$(echo "$PCT_CLI3 == 100.00" | bc -l)" -eq 1 ]; then
    echo "✔ TESTE 3 PASSOU: Cliente subiu para o Nível 4 (Rei da Cadeira) e barra percentual travou em 100.00%."
else
    echo "✘ TESTE 3 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 4: Limite Máximo no Nível 4 (1050 XP + 25 XP = 1075 XP -> Nível 4, barra 100%)
# -------------------------------------------------------------
echo "Executando Teste 4: ganho de XP mantendo limite máximo no Nível 4..."
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN4_ID}" "$API_URL/api/v1/atendimentos/concluir" > /dev/null

XP_CLI4=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI4_ID;")
NIVEL_CLI4=$(db_exec "SELECT nivelatual FROM ProgressoCliente WHERE clienteid=$CLI4_ID;")
PCT_CLI4=$(db_exec "SELECT barrapercentual FROM ProgressoCliente WHERE clienteid=$CLI4_ID;")

echo "Resultados Teste 4 - XP: $XP_CLI4, Nivel: $NIVEL_CLI4, Progresso: $PCT_CLI4%"

if [ "$XP_CLI4" -eq 1075 ] && [ "$NIVEL_CLI4" -eq 4 ] && [ "$(echo "$PCT_CLI4 == 100.00" | bc -l)" -eq 1 ]; then
    echo "✔ TESTE 4 PASSOU: Cliente continuou no Nível 4 (Rei da Cadeira) com a barra travada em 100.00%."
else
    echo "✘ TESTE 4 FALHOU!"
    exit 1
fi

echo "===== TODOS OS TESTES DE PROGRESSO RPG PASSARAM COM SUCESSO ====="
