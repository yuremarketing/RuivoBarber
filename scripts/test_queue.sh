#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DO CONTROLE DE FILA E TEMPO MÉDIO ====="

# 1. Limpar dados anteriores de teste
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_q_cli');"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_q_cli');"
db_exec "DELETE FROM Usuarios WHERE login IN ('test_q_cli', 'test_q_barb', 'test_q_adm');"

# 2. Inserir Usuários de Teste
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Fila', 'Cliente', 'test_q_cli', 'pwd');"
CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_q_cli';")

db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Barbeiro Fila', 'Barbeiro', 'test_q_barb', 'pwd');"
BARB_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_q_barb';")

db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Admin Fila', 'Adm', 'test_q_adm', 'pwd');"

# 3. Obter Tokens JWT
AUTH_ADM=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_q_adm", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
ADM_TOKEN=$(echo "$AUTH_ADM" | jq -r '.token')

if [ -z "$ADM_TOKEN" ] || [ "$ADM_TOKEN" == "null" ]; then
    echo "❌ Falha ao obter token JWT de administrador!"
    exit 1
fi

# 4. Criar Agendamento de Teste (Corte Simples)
db_exec "UPDATE Produtos SET quantidade = 100;"
db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI_ID, $BARB_ID, 1, NOW() + INTERVAL '1 hour', 'Confirmado');"
AGEN_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI_ID ORDER BY id DESC LIMIT 1;")

echo "Agendamento criado com ID: $AGEN_ID"

# -------------------------------------------------------------
# TESTE 1: Registrar Check-In Físico
# -------------------------------------------------------------
echo "Executando Teste 1: Registrar Check-In..."
RESP1=$(curl -s -X POST -H "Authorization: Bearer $ADM_TOKEN" "$API_URL/api/v1/atendimentos/$AGEN_ID/checkin")
echo "Resposta: $RESP1"

STATUS1=$(db_exec "SELECT status FROM Agendamentos WHERE id = $AGEN_ID;")
CHECKIN_TIME1=$(db_exec "SELECT checkintime FROM Agendamentos WHERE id = $AGEN_ID;")

if [ "$STATUS1" == "Presente" ] && [ -n "$CHECKIN_TIME1" ]; then
    echo "✔ TESTE 1 PASSOU: Status atualizado para 'Presente' e CheckInTime gravado."
else
    echo "✘ TESTE 1 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 2: Registrar Início do Serviço (Em Cadeira)
# -------------------------------------------------------------
echo "Executando Teste 2: Registrar Em Cadeira..."
RESP2=$(curl -s -X POST -H "Authorization: Bearer $ADM_TOKEN" "$API_URL/api/v1/atendimentos/$AGEN_ID/em-cadeira")
echo "Resposta: $RESP2"

STATUS2=$(db_exec "SELECT status FROM Agendamentos WHERE id = $AGEN_ID;")
EMCADEIRA_TIME2=$(db_exec "SELECT emcadeiratime FROM Agendamentos WHERE id = $AGEN_ID;")

if [ "$STATUS2" == "EmCadeira" ] && [ -n "$EMCADEIRA_TIME2" ]; then
    echo "✔ TESTE 2 PASSOU: Status atualizado para 'EmCadeira' e EmCadeiraTime gravado."
else
    echo "✘ TESTE 2 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 3: Concluir Atendimento e Registrar ConcluidoTime
# -------------------------------------------------------------
echo "Executando Teste 3: Concluir Atendimento..."
RESP3=$(curl -s -X POST -H "Authorization: Bearer $ADM_TOKEN" -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN_ID}" "$API_URL/api/v1/atendimentos/concluir")
echo "Resposta: $RESP3"

STATUS3=$(db_exec "SELECT status FROM Agendamentos WHERE id = $AGEN_ID;")
CONCLUIDO_TIME3=$(db_exec "SELECT concluidotime FROM Agendamentos WHERE id = $AGEN_ID;")

if [ "$STATUS3" == "Concluido" ] && [ -n "$CONCLUIDO_TIME3" ]; then
    echo "✔ TESTE 3 PASSOU: Status concluído e ConcluidoTime gravado."
else
    echo "✘ TESTE 3 FALHOU!"
    exit 1
fi

# -------------------------------------------------------------
# TESTE 4: Simulação de Tempos para Validar Métricas Matemáticas
# Espera = 20 minutos (EmCadeiraTime - CheckInTime)
# Atendimento = 10 minutos (ConcluidoTime - EmCadeiraTime)
# -------------------------------------------------------------
echo "Executando Teste 4: Ajuste de Timestamps e Teste de Métricas..."

db_exec "UPDATE Agendamentos SET checkintime = NOW() - INTERVAL '30 minutes', emcadeiratime = NOW() - INTERVAL '10 minutes', concluidotime = NOW() WHERE id = $AGEN_ID;"

METRICAS_RESP=$(curl -s -H "Authorization: Bearer $ADM_TOKEN" "$API_URL/api/v1/atendimentos/metricas")
echo "Métricas: $METRICAS_RESP"

ESPERA=$(echo "$METRICAS_RESP" | jq -r '.tempoMedioEsperaMinutos')
ATENDIMENTO=$(echo "$METRICAS_RESP" | jq -r '.tempoMedioAtendimentoMinutos')
TOTAL=$(echo "$METRICAS_RESP" | jq -r '.totalAtendimentosConcluidos')

# Arredondando os valores retornados pelo jq para comparação aproximada de float
# Esperamos Espera ~= 20 e Atendimento ~= 10
# Usando a ferramenta bc do bash para verificar faixas de float
IS_ESPERA_CORRECT=$(echo "$ESPERA >= 19.9 && $ESPERA <= 20.1" | bc)
IS_ATENDIMENTO_CORRECT=$(echo "$ATENDIMENTO >= 9.9 && $ATENDIMENTO <= 10.1" | bc)

if [ "$IS_ESPERA_CORRECT" -eq 1 ] && [ "$IS_ATENDIMENTO_CORRECT" -eq 1 ] && [ "$TOTAL" -eq 1 ]; then
    echo "✔ TESTE 4 PASSOU: Cálculo de tempo médio de espera (20 min) e atendimento (10 min) validado."
else
    echo "✘ TESTE 4 FALHOU! Esperado Espera ~= 20, Atendimento ~= 10, Total = 1."
    exit 1
fi

# Limpar dados após o teste
db_exec "DELETE FROM Agendamentos WHERE clienteid = $CLI_ID;"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid = $CLI_ID;"
db_exec "DELETE FROM Usuarios WHERE login IN ('test_q_cli', 'test_q_barb', 'test_q_adm');"

echo "===== TODOS OS TESTES DE FILA E METRICAS PASSARAM COM SUCESSO ====="
