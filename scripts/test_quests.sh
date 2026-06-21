#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DO SISTEMA DE MISSÕES SEMANAIS DO CLÃ (QUESTS DE GUILDA) ====="

# 1. Limpar registros anteriores de teste
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_quest_cli');"
db_exec "DELETE FROM ClaMissoesProgresso WHERE claid IN (SELECT id FROM Clas WHERE nome = 'Cla Quest Test');"
db_exec "DELETE FROM ClaMissoesSemanais;"
db_exec "DELETE FROM ClaConvites WHERE claid IN (SELECT id FROM Clas WHERE nome = 'Cla Quest Test');"
db_exec "DELETE FROM ClaMembros WHERE claid IN (SELECT id FROM Clas WHERE nome = 'Cla Quest Test');"
db_exec "DELETE FROM Clas WHERE nome = 'Cla Quest Test';"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('test_quest_cli'));"
db_exec "DELETE FROM Usuarios WHERE login IN ('test_quest_cli', 'admin_quest');"
db_exec "DELETE FROM Servicos WHERE nome IN ('Corte Teste Quests', 'Barba Teste Quests');"

# 2. Registrar usuários de teste
echo "[+] Criando usuário Cliente..."
CLI_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"nome": "Cliente Quests", "login": "test_quest_cli", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/register")
CLI_TOKEN=$(echo "$CLI_RESP" | jq -r '.token')
CLI_ID=$(echo "$CLI_RESP" | jq -r '.user.id')

echo "[+] Criando usuário Admin..."
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Admin Quests', 'Adm', 'admin_quest', 'pwd');"
ADMIN_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"login": "admin_quest", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/login")
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | jq -r '.token')

# 3. Criar Clã para o cliente
echo "[+] Criando Clã 'Cla Quest Test'..."
CREATE_RESP=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $CLI_TOKEN" \
  -d '{"nome": "Cla Quest Test", "descricao": "Clã para teste de quests"}' \
  "$API_URL/api/v1/clas")
CLA_ID=$(echo "$CREATE_RESP" | jq -r '.id')

if [ -z "$CLA_ID" ] || [ "$CLA_ID" == "null" ]; then
  echo "✘ TESTE FALHOU: Criação do clã falhou."
  exit 1
fi
echo "✔ Clã criado com sucesso! ID: $CLA_ID"

# 4. Verificar lista de missões semanais inicialmente (deve conter exatamente 3 missões ativas)
echo "[+] Buscando missões semanais (/api/v1/clas/missoes)..."
QUESTS_INIT=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/clas/missoes")
echo "Missões Ativas: $QUESTS_INIT"

QUEST_COUNT=$(echo "$QUESTS_INIT" | jq '. | length')
if [ "$QUEST_COUNT" -ne 3 ]; then
  echo "✘ TESTE FALHOU: O clã deveria ter exatamente 3 missões ativas na semana (Obtido: $QUEST_COUNT)."
  exit 1
fi
echo "✔ 3 missões semanais ativas inicializadas com sucesso."

# Validar que o progresso inicial de todas é 0 e nenhuma está completada
ZERO_PROGRESS_COUNT=$(echo "$QUESTS_INIT" | jq '[.[] | select(.progresso == 0 and .completada == false)] | length')
if [ "$ZERO_PROGRESS_COUNT" -ne 3 ]; then
  echo "✘ TESTE FALHOU: Nem todas as missões possuem progresso inicial igual a 0."
  exit 1
fi
echo "✔ Progresso inicial zerado validado com sucesso."

# 5. Agendar e concluir um serviço do tipo "Corte"
# Criar serviços necessários
db_exec "INSERT INTO Servicos (nome, preco, duracaominutos, xprecompensa) VALUES ('Corte Teste Quests', 50.00, 30, 10);"
SERVICO_CORTE_ID=$(db_exec "SELECT id FROM Servicos WHERE nome='Corte Teste Quests' LIMIT 1;")

BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE cargo='Barbeiro' LIMIT 1;")
if [ -z "$BARBEIRO_ID" ]; then
  db_exec "INSERT INTO Usuarios (nome, cargo, login, senha, comissao) VALUES ('Barbeiro Test Quests', 'Barbeiro', 'test_quests_barb', 'pwd', 30.00);"
  BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_quests_barb';")
fi

echo "[+] Agendando corte 1 para o Cliente..."
db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI_ID, $BARBEIRO_ID, $SERVICO_CORTE_ID, NOW() + INTERVAL '1 hour', 'Confirmado');"
AGEN_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI_ID ORDER BY id DESC LIMIT 1;")

echo "[+] Concluindo corte 1 (ID: $AGEN_ID)..."
curl -s -o /dev/null -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d "{\"agendamento_id\": $AGEN_ID}" \
  "$API_URL/api/v1/atendimentos/concluir"

# 6. Validar incrementos de progresso nas missões correspondentes
echo "[+] Buscando progresso das missões após concluir o primeiro corte..."
QUESTS_MID=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/clas/missoes")
echo "Progresso das Missões: $QUESTS_MID"

# Cortes deve ser 1
# Atendimentos deve ser 1
# XpClã deve ser 1 (cada atendimento adiciona 1 de XP ao clã)
CORTES_PROG=$(echo "$QUESTS_MID" | jq -r '.[] | select(.tipoRequisito == "Cortes") | .progresso')
ATEND_PROG=$(echo "$QUESTS_MID" | jq -r '.[] | select(.tipoRequisito == "Atendimentos") | .progresso')
XP_PROG=$(echo "$QUESTS_MID" | jq -r '.[] | select(.tipoRequisito == "XpClã") | .progresso')

if [ -n "$CORTES_PROG" ] && [ "$CORTES_PROG" -ne 1 ]; then
  echo "✘ TESTE FALHOU: A missão de Cortes deveria ter progresso 1 (Obtido: $CORTES_PROG)."
  exit 1
fi

if [ -n "$ATEND_PROG" ] && [ "$ATEND_PROG" -ne 1 ]; then
  echo "✘ TESTE FALHOU: A missão de Atendimentos deveria ter progresso 1 (Obtido: $ATEND_PROG)."
  exit 1
fi

if [ -n "$XP_PROG" ] && [ "$XP_PROG" -ne 1 ]; then
  echo "✘ TESTE FALHOU: A missão de XpClã deveria ter progresso 1 (Obtido: $XP_PROG)."
  exit 1
fi
echo "✔ Incremento de progresso nas missões validado com sucesso!"

# 7. Forçar meta quase batida e concluir outro atendimento para testar conclusão da quest e bônus de XP do Clã
# Obter os IDs das missões ativas
SEMANA_ANO=$(db_exec "SELECT semanaano FROM ClaMissoesSemanais LIMIT 1;")
CORTES_QUEST_ID=$(echo "$QUESTS_MID" | jq -r '.[] | select(.tipoRequisito == "Cortes") | .questId')

if [ -n "$CORTES_QUEST_ID" ] && [ "$CORTES_QUEST_ID" != "null" ]; then
  echo "[+] Simulando progresso de 4/5 para a quest de Cortes (ID: $CORTES_QUEST_ID)..."
  # Se o registro na tabela de progresso já existir, atualiza para 4, senão insere
  db_exec "INSERT INTO ClaMissoesProgresso (claid, missaoid, semanaano, progresso) VALUES ($CLA_ID, $CORTES_QUEST_ID, '$SEMANA_ANO', 4) ON CONFLICT (claid, missaoid, semanaano) DO UPDATE SET progresso = 4;"

  echo "[+] Agendando corte 2 para o Cliente..."
  db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI_ID, $BARBEIRO_ID, $SERVICO_CORTE_ID, NOW() + INTERVAL '2 hours', 'Confirmado');"
  AGEN_ID_2=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI_ID ORDER BY id DESC LIMIT 1;")

  echo "[+] Concluindo corte 2 (ID: $AGEN_ID_2)..."
  curl -s -o /dev/null -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
    -d "{\"agendamento_id\": $AGEN_ID_2}" \
    "$API_URL/api/v1/atendimentos/concluir"

  echo "[+] Buscando progresso das missões após o segundo corte..."
  QUESTS_FINAL=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/clas/missoes")
  echo "Progresso das Missões Final: $QUESTS_FINAL"

  CORTES_COMPLETADA=$(echo "$QUESTS_FINAL" | jq -r '.[] | select(.tipoRequisito == "Cortes") | .completada')
  CORTES_PROG_FINAL=$(echo "$QUESTS_FINAL" | jq -r '.[] | select(.tipoRequisito == "Cortes") | .progresso')

  if [ "$CORTES_COMPLETADA" != "true" ] || [ "$CORTES_PROG_FINAL" -ne 5 ]; then
    echo "✘ TESTE FALHOU: A missão de Cortes deveria estar completada e com progresso 5 (Obtido: completada=$CORTES_COMPLETADA, progresso=$CORTES_PROG_FINAL)."
    exit 1
  fi
  echo "✔ Missão completada com sucesso!"

  # Verificar se o Clã recebeu o bônus de XP (bônus da missão de Cortes é 80 XP. Mais 2 cortes concluídos = 82 XP total)
  XP_COLETIVO=$(db_exec "SELECT xpcoletivo FROM Clas WHERE id = $CLA_ID;")
  echo "[+] XP Coletivo do Clã: $XP_COLETIVO"
  if [ "$XP_COLETIVO" -ne 82 ]; then
    echo "✘ TESTE FALHOU: O clã deveria ter acumulado 82 de XP Coletivo (80 do bônus + 2 dos cortes). Obtido: $XP_COLETIVO."
    exit 1
  fi
  echo "✔ XP Coletivo bônus de 80 XP concedido ao Clã com sucesso!"
fi

# 8. Limpar dados de teste
echo "[+] Limpando registros de teste..."
db_exec "DELETE FROM Agendamentos WHERE clienteid = $CLI_ID;"
db_exec "DELETE FROM ClaMissoesProgresso WHERE claid = $CLA_ID;"
db_exec "DELETE FROM ClaMissoesSemanais WHERE semanaano = '$SEMANA_ANO';"
db_exec "DELETE FROM ClaMembros WHERE claid = $CLA_ID;"
db_exec "DELETE FROM Clas WHERE id = $CLA_ID;"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid = $CLI_ID;"
db_exec "DELETE FROM Usuarios WHERE id = $CLI_ID;"
db_exec "DELETE FROM Usuarios WHERE login = 'admin_quest';"
db_exec "DELETE FROM Servicos WHERE id = $SERVICO_CORTE_ID;"

echo "===== TODOS OS TESTES DO SISTEMA DE MISSÕES SEMANAIS PASSARAM COM SUCESSO! ====="
