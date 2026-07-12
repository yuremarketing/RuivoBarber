#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}
TEST_DATE=$(date +%Y-%m-%d -d "+2 days")

echo "===== INICIANDO TESTE DE AGENDA E OVERBOOKING (TASK #38) ====="

# 1. Preparar massa de testes
db_exec "DELETE FROM Agendamentos WHERE barbeiroid IN (SELECT id FROM Usuarios WHERE login = 'test_barber_agenda');"
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_cli_agenda');"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_cli_agenda');"
db_exec "DELETE FROM Usuarios WHERE login = 'test_barber_agenda';"
db_exec "DELETE FROM Usuarios WHERE login = 'test_cli_agenda';"

# Inserir Barbeiro e Cliente
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha, comissao) VALUES ('Barbeiro Teste', 'Barbeiro', 'test_barber_agenda', 'pwd', 30.00);"
BARB_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_barber_agenda';")
db_exec "INSERT INTO BarbeiroDisponibilidade (BarbeiroID, DiaSemana, HoraInicio, HoraFim) VALUES 
  ($BARB_ID, 0, '09:00:00', '19:00:00'),
  ($BARB_ID, 1, '09:00:00', '19:00:00'),
  ($BARB_ID, 2, '09:00:00', '19:00:00'),
  ($BARB_ID, 3, '09:00:00', '19:00:00'),
  ($BARB_ID, 4, '09:00:00', '19:00:00'),
  ($BARB_ID, 5, '09:00:00', '19:00:00'),
  ($BARB_ID, 6, '09:00:00', '19:00:00') ON CONFLICT DO NOTHING;"

db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Teste', 'Cliente', 'test_cli_agenda', 'pwd');"
CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_cli_agenda';")

# 2. Obter token JWT
AUTH_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_cli_agenda", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')

# 3. Consultar Slots iniciais (Serviço 2: Corte + Barba, id=2, duração = 60 minutos)
echo "Consultando slots iniciais para o barbeiro $BARB_ID em $TEST_DATE..."
SLOTS_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/barbeiros/$BARB_ID/agenda?data=$TEST_DATE&servico_id=2")

# Verificar se slots de 09:00 e 09:30 estão livres (available = true)
SLOT_0900_AVAIL=$(echo "$SLOTS_RESP" | jq -r '.[] | select(.time=="09:00") | .available')
SLOT_0930_AVAIL=$(echo "$SLOTS_RESP" | jq -r '.[] | select(.time=="09:30") | .available')

echo "Slot 09:00 disponível? $SLOT_0900_AVAIL"
echo "Slot 09:30 disponível? $SLOT_0930_AVAIL"

if [ "$SLOT_0900_AVAIL" == "true" ] && [ "$SLOT_0930_AVAIL" == "true" ]; then
    echo "✔ TESTE 3.1 PASSOU: Slots iniciais disponíveis ok."
else
    echo "✘ TESTE 3.1 FALHOU!"
    exit 1
fi

# 4. Criar agendamento às 09:30 (Corte + Barba, id=2, duração = 60 minutos, vai ocupar até 10:30)
echo "Criando agendamento às 09:30..."
CREATE_RESP=$(curl -s -w "\n%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"barbeiro_id\": $BARB_ID, \"servico_id\": 2, \"data_hora\": \"$TEST_DATE 09:30\"}" "$API_URL/api/v1/agendamentos")

CREATE_STATUS=$(echo "$CREATE_RESP" | tail -n1)
CREATE_BODY=$(echo "$CREATE_RESP" | head -n-1)

echo "Código HTTP de criação: $CREATE_STATUS"
echo "Resposta: $CREATE_BODY"

if [ "$CREATE_STATUS" == "201" ]; then
    echo "✔ TESTE 4.1 PASSOU: Agendamento criado com sucesso."
else
    echo "✘ TESTE 4.1 FALHOU!"
    exit 1
fi

# 5. Consultar Slots novamente. Com agendamento das 09:30 às 10:30:
# - Slot 09:00 (60min, termina 10:00, conflita com 09:30-10:30) -> Deve estar indisponível
# - Slot 09:30 (60min, termina 10:30, conflita com 09:30-10:30) -> Deve estar indisponível
# - Slot 10:00 (60min, termina 11:00, conflita com 09:30-10:30) -> Deve estar indisponível
# - Slot 10:30 (60min, termina 11:30, não conflita) -> Deve estar disponível
echo "Consultando slots novamente..."
SLOTS_RESP2=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/barbeiros/$BARB_ID/agenda?data=$TEST_DATE&servico_id=2")

SLOT_0900_AVAIL2=$(echo "$SLOTS_RESP2" | jq -r '.[] | select(.time=="09:00") | .available')
SLOT_0930_AVAIL2=$(echo "$SLOTS_RESP2" | jq -r '.[] | select(.time=="09:30") | .available')
SLOT_1000_AVAIL2=$(echo "$SLOTS_RESP2" | jq -r '.[] | select(.time=="10:00") | .available')
SLOT_1030_AVAIL2=$(echo "$SLOTS_RESP2" | jq -r '.[] | select(.time=="10:30") | .available')

echo "Slot 09:00 disponível agora? $SLOT_0900_AVAIL2"
echo "Slot 09:30 disponível agora? $SLOT_0930_AVAIL2"
echo "Slot 10:00 disponível agora? $SLOT_1000_AVAIL2"
echo "Slot 10:30 disponível agora? $SLOT_1030_AVAIL2"

if [ "$SLOT_0900_AVAIL2" == "false" ] && [ "$SLOT_0930_AVAIL2" == "false" ] && [ "$SLOT_1000_AVAIL2" == "false" ] && [ "$SLOT_1030_AVAIL2" == "true" ]; then
    echo "✔ TESTE 5.1 PASSOU: Slots bloqueados corretamente baseado na duração e conflito."
else
    echo "✘ TESTE 5.1 FALHOU!"
    exit 1
fi

# 6. Tentar criar outro agendamento conflitante (ex: às 10:00) -> Deve retornar 409 Conflict
echo "Tentando criar agendamento conflitante às 10:00 (Corte Simples)..."
CONFLICT_RESP=$(curl -s -w "\n%{http_code}" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"barbeiro_id\": $BARB_ID, \"servico_id\": 1, \"data_hora\": \"$TEST_DATE 10:00\"}" "$API_URL/api/v1/agendamentos")

CONFLICT_STATUS=$(echo "$CONFLICT_RESP" | tail -n1)
CONFLICT_BODY=$(echo "$CONFLICT_RESP" | head -n-1)

echo "Código HTTP de conflito (esperado 409): $CONFLICT_STATUS"
echo "Resposta: $CONFLICT_BODY"

if [ "$CONFLICT_STATUS" == "409" ] && [[ "$CONFLICT_BODY" == *"conflito"* ]]; then
    echo "✔ TESTE 6.1 PASSOU: Overbooking impedido e erro 409 Conflict retornado."
else
    echo "✘ TESTE 6.1 FALHOU!"
    exit 1
fi

echo "===== TODOS OS TESTES DE AGENDA E OVERBOOKING PASSARAM COM SUCESSO ====="
