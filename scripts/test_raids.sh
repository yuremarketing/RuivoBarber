#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DO SISTEMA DE RAIDS (META COMUNITÁRIA DE CORTES) ====="

# 1. Limpar dados anteriores de teste
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_raid_cli');"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_raid_cli');"
db_exec "DELETE FROM RaidContribuicoes WHERE usuarioid IN (SELECT id FROM Usuarios WHERE login = 'test_raid_cli');"
db_exec "DELETE FROM Raids WHERE nome = 'Raid de Teste';"
db_exec "DELETE FROM Usuarios WHERE login IN ('test_raid_cli', 'test_raid_adm');"

# 2. Inserir Cliente e Admin de Teste
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Raid', 'Cliente', 'test_raid_cli', 'pwd');"
CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_raid_cli';")

db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Admin Raid', 'Adm', 'test_raid_adm', 'pwd');"

# 3. Inserir Raid Ativa de Teste (Meta = 2 cortes, requisito = 'Cortes')
db_exec "INSERT INTO Raids (nome, descricao, meta, progresso, tiporequisito, recompensaxp, recompensamoedas, datainicio, datafim, status) VALUES ('Raid de Teste', 'Cortar cabelo de forma cooperativa', 2, 0, 'Cortes', 100, 100, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '1 day', 'Ativo');"
RAID_ID=$(db_exec "SELECT id FROM Raids WHERE nome = 'Raid de Teste';")

echo "Raid de teste criada com ID: $RAID_ID"

# 4. Obter Tokens JWT
AUTH_CLI=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_raid_cli", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
CLI_TOKEN=$(echo "$AUTH_CLI" | jq -r '.token')

AUTH_ADM=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_raid_adm", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
ADM_TOKEN=$(echo "$AUTH_ADM" | jq -r '.token')

if [ -z "$CLI_TOKEN" ] || [ "$CLI_TOKEN" == "null" ] || [ -z "$ADM_TOKEN" ] || [ "$ADM_TOKEN" == "null" ]; then
    echo "❌ Falha ao obter tokens JWT!"
    exit 1
fi

# 5. Verificar status inicial da Raid Ativa
echo "Verificando status inicial da Raid..."
STATUS_RESP=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/raids/ativa")
echo "Resposta: $STATUS_RESP"

INITIAL_PROG=$(echo "$STATUS_RESP" | jq -r '.raid.progresso')
INITIAL_CONTRIB=$(echo "$STATUS_RESP" | jq -r '.minhaContribuicao')

if [ "$INITIAL_PROG" -eq 0 ] && [ "$INITIAL_CONTRIB" -eq 0 ]; then
    echo "✔ Status inicial validado com sucesso (progresso = 0)."
else
    echo "❌ Status inicial inválido!"
    exit 1
fi

# 6. Agendar e concluir 2 atendimentos de corte para simular progresso da Raid
BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE cargo='Barbeiro' LIMIT 1;")
if [ -z "$BARBEIRO_ID" ]; then
    db_exec "INSERT INTO Usuarios (nome, cargo, login, senha, comissao) VALUES ('Barbeiro Test', 'Barbeiro', 'test_raid_barb', 'pwd', 30.00);"
    BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_raid_barb';")
fi

# Garantir estoque de produtos
db_exec "UPDATE Produtos SET quantidade = 100;"

# Agendar corte 1 (ServicoID = 1: Corte Simples)
db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI_ID, $BARBEIRO_ID, 1, NOW() + INTERVAL '1 hour', 'Confirmado');"
AGEN1_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI_ID ORDER BY id DESC LIMIT 1;")

# Concluir corte 1
echo "Concluindo primeiro atendimento (ID: $AGEN1_ID)..."
curl -s -X POST -H "Authorization: Bearer $ADM_TOKEN" -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN1_ID}" "$API_URL/api/v1/atendimentos/concluir" > /dev/null

# Verificar progresso intermediário da Raid
STATUS_RESP1=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/raids/ativa")
echo "Status após 1º corte: $STATUS_RESP1"
PROG1=$(echo "$STATUS_RESP1" | jq -r '.raid.progresso')
CONTRIB1=$(echo "$STATUS_RESP1" | jq -r '.minhaContribuicao')

if [ "$PROG1" -eq 1 ] && [ "$CONTRIB1" -eq 1 ]; then
    echo "✔ Progresso intermediário incrementado com sucesso."
else
    echo "❌ Falha no incremento do progresso intermediário!"
    exit 1
fi

# Agendar corte 2
db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI_ID, $BARBEIRO_ID, 1, NOW() + INTERVAL '2 hours', 'Confirmado');"
AGEN2_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI_ID ORDER BY id DESC LIMIT 1;")

# Concluir corte 2
echo "Concluindo segundo atendimento (ID: $AGEN2_ID)..."
curl -s -X POST -H "Authorization: Bearer $ADM_TOKEN" -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN2_ID}" "$API_URL/api/v1/atendimentos/concluir" > /dev/null

# Verificar conclusão da Raid
STATUS_RESP2=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/raids/ativa")
echo "Status após 2º corte: $STATUS_RESP2"
PROG2=$(echo "$STATUS_RESP2" | jq -r '.raid.progresso')
STATUS2=$(echo "$STATUS_RESP2" | jq -r '.raid.status')
PODE_RESGATAR2=$(echo "$STATUS_RESP2" | jq -r '.podeResgatar')

if [ "$PROG2" -eq 2 ] && [ "$STATUS2" == "Concluido" ] && [ "$PODE_RESGATAR2" == "true" ]; then
    echo "✔ Raid concluída com sucesso e pronta para resgatar."
else
    echo "❌ Falha na conclusão da Raid!"
    exit 1
fi

# 7. Resgatar Recompensa
echo "Reivindicando recompensa da Raid..."
RESGATE_RESP=$(curl -s -X POST -H "Authorization: Bearer $CLI_TOKEN" -H "Content-Type: application/json" -d "{\"raidId\": $RAID_ID}" "$API_URL/api/v1/raids/resgatar")
echo "Resposta do resgate: $RESGATE_RESP"

# Verificar XP e Moedas do cliente no banco
# Inicialmente o cliente tinha 0 XP. 
# Ganhou 10 XP por cada um dos 2 cortes = 20 XP.
# Ganhou 100 XP bônus da Raid concluída = 100 XP.
# Ganhou 50 XP bônus por desbloquear a Badge "Primeiro Sangue".
# Total esperado: 170 XP e 170 Moedas.
XP_BANCO=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
MOEDAS_BANCO=$(db_exec "SELECT moedas FROM ProgressoCliente WHERE clienteid=$CLI_ID;")

echo "Pontuação final no banco -> XP: $XP_BANCO, Moedas: $MOEDAS_BANCO"

if [ "$XP_BANCO" -eq 170 ] && [ "$MOEDAS_BANCO" -eq 170 ]; then
    echo "✔ Recompensa de XP e Moedas creditada com sucesso no perfil do jogador."
else
    echo "❌ Creditamento incorreto de recompensas!"
    exit 1
fi

# 8. Tentar resgatar novamente (deve falhar)
echo "Tentando resgatar a recompensa novamente..."
DUP_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $CLI_TOKEN" -H "Content-Type: application/json" -d "{\"raidId\": $RAID_ID}" "$API_URL/api/v1/raids/resgatar")

if [ "$DUP_RESP" -eq 400 ]; then
    echo "✔ Teste de resgate duplicado bloqueado com sucesso (HTTP 400)."
else
    echo "❌ Falha ao bloquear resgate duplicado (HTTP $DUP_RESP)!"
    exit 1
fi

# Limpar dados após o teste
db_exec "DELETE FROM Agendamentos WHERE clienteid = $CLI_ID;"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid = $CLI_ID;"
db_exec "DELETE FROM RaidContribuicoes WHERE usuarioid = $CLI_ID;"
db_exec "DELETE FROM Raids WHERE id = $RAID_ID;"
db_exec "DELETE FROM Usuarios WHERE login IN ('test_raid_cli', 'test_raid_adm');"

echo "===== TODOS OS TESTES DO SISTEMA DE RAIDS PASSARAM COM SUCESSO ====="
