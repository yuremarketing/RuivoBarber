#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DO SISTEMA DE BADGES (CONQUISTAS RPG) ====="

# 1. Limpar dados anteriores de teste
db_exec "DELETE FROM UsuarioBadges WHERE usuarioid IN (SELECT id FROM Usuarios WHERE login IN ('test_badge_cli', 'admin_badge'));"
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('test_badge_cli'));"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('test_badge_cli'));"
db_exec "DELETE FROM Usuarios WHERE login IN ('test_badge_cli', 'admin_badge');"
db_exec "DELETE FROM Servicos WHERE nome = 'Corte Teste Badges';"

# 2. Registrar usuários e obter tokens
echo "[+] Criando usuário Cliente..."
CLI_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"nome": "Cliente Badges", "login": "test_badge_cli", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/register")
CLI_TOKEN=$(echo "$CLI_RESP" | jq -r '.token')
CLI_ID=$(echo "$CLI_RESP" | jq -r '.user.id')

echo "[+] Criando usuário Admin..."
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Admin Badges', 'Adm', 'admin_badge', 'pwd');"
ADMIN_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"login": "admin_badge", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/login")
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | jq -r '.token')

# 3. Teste inicial: verificar lista de medalhas bloqueadas
echo "[+] Buscando medalhas do cliente inicialmente (/api/v1/badges/me)..."
BADGES_INIT=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/badges/me")
echo "Badges Iniciais: $BADGES_INIT"

LOCKED_COUNT=$(echo "$BADGES_INIT" | jq '[.[] | select(.desbloqueada == false)] | length')
UNLOCKED_COUNT=$(echo "$BADGES_INIT" | jq '[.[] | select(.desbloqueada == true)] | length')

if [ "$LOCKED_COUNT" -ne 4 ] || [ "$UNLOCKED_COUNT" -ne 0 ]; then
    echo "✘ TESTE FALHOU: O usuário deveria ter as 4 medalhas bloqueadas inicialmente"
    exit 1
fi
echo "✔ Validação inicial das medalhas bloqueadas passou!"

# 4. Agendar corte e concluir
BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE cargo='Barbeiro' LIMIT 1;")
if [ -z "$BARBEIRO_ID" ]; then
    db_exec "INSERT INTO Usuarios (nome, cargo, login, senha, comissao) VALUES ('Barbeiro Test Badges', 'Barbeiro', 'test_badges_barb', 'pwd', 30.00);"
    BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_badges_barb';")
fi

# Criar serviço temporário que fornece exatamente 50 XP
db_exec "INSERT INTO Servicos (nome, preco, duracaominutos, xprecompensa) VALUES ('Corte Teste Badges', 50.00, 30, 50);"
SERVICO_ID=$(db_exec "SELECT id FROM Servicos WHERE nome='Corte Teste Badges' LIMIT 1;")

echo "[+] Agendando corte 1 para o Cliente..."
db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI_ID, $BARBEIRO_ID, $SERVICO_ID, NOW() + INTERVAL '1 hour', 'Confirmado');"
AGEN_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI_ID ORDER BY id DESC LIMIT 1;")

echo "[+] Concluindo corte 1 (ID: $AGEN_ID)..."
curl -s -o /dev/null -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d "{\"agendamento_id\": $AGEN_ID}" \
  "$API_URL/api/v1/atendimentos/concluir"

# 5. Validar bônus do primeiro corte (Primeiro Sangue)
# Requisito do primeiro corte (1 corte) desbloqueia 'Primeiro Sangue' (+50 XP).
# XP do serviço (50 XP) + Badge (50 XP) = 100 XP.
# Nível deve ser 1 (Corte Iniciante requer >= 100 XP, Barba de Respeito requer >= 300 XP).
echo "[+] Buscando medalhas após corte 1 (/api/v1/badges/me)..."
BADGES_AFTER=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/badges/me")
echo "Badges após corte 1: $BADGES_AFTER"

PRIMEIRO_SANGUE=$(echo "$BADGES_AFTER" | jq -r '.[] | select(.nome == "Primeiro Sangue") | .desbloqueada')
BARBA_DE_RESPEITO=$(echo "$BADGES_AFTER" | jq -r '.[] | select(.nome == "Barba de Respeito") | .desbloqueada')

if [ "$PRIMEIRO_SANGUE" != "true" ] || [ "$BARBA_DE_RESPEITO" != "false" ]; then
    echo "✘ TESTE FALHOU: Medalha 'Primeiro Sangue' deve ser true e 'Barba de Respeito' deve ser false."
    exit 1
fi
echo "✔ Medalha 'Primeiro Sangue' desbloqueada e 'Barba de Respeito' ainda bloqueada."

XP_ATUAL=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
NIVEL_ATUAL=$(db_exec "SELECT nivelatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")

if [ "$XP_ATUAL" -ne 100 ] || [ "$NIVEL_ATUAL" -ne 1 ]; then
    echo "✘ TESTE FALHOU: Progresso do cliente deveria ser 100 XP e Nível 1. Obtido: XP=$XP_ATUAL, Nível=$NIVEL_ATUAL."
    exit 1
fi
echo "✔ Progresso após corte 1 validado! XP: $XP_ATUAL (esperado 100), Nível: $NIVEL_ATUAL (esperado 1)"

# 6. Concluir mais 4 atendimentos para liberar 'Fiel da Navalha' (5 cortes) e alcançar Nível 2 (Barba de Respeito)
echo "[+] Concluindo mais 4 atendimentos para atingir a marca de 5 cortes..."
for i in {1..4}; do
    db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI_ID, $BARBEIRO_ID, $SERVICO_ID, NOW() + INTERVAL '$((i+1)) hours', 'Confirmado');"
    AGEN_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI_ID ORDER BY id DESC LIMIT 1;")
    curl -s -o /dev/null -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
      -d "{\"agendamento_id\": $AGEN_ID}" \
      "$API_URL/api/v1/atendimentos/concluir"
done

# 7. Validar liberação em cascata das medalhas 'Fiel da Navalha' e 'Barba de Respeito'
# 5 cortes -> 5 * 50 XP (serviços) + 50 XP (Primeiro Sangue) = 300 XP -> Nível 2.
# Nível 2 -> Desbloqueia 'Barba de Respeito' (+50 XP) -> Total 350 XP.
# 5 cortes -> Desbloqueia 'Fiel da Navalha' (+50 XP) -> Total 400 XP.
# Nível deve ser 2 (Barba de Respeito >= 300 XP, Lenda da Navalha >= 600 XP).
BADGES_FINAL=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/badges/me")
echo "Badges após 5 cortes: $BADGES_FINAL"

FIEL_NAVALHA=$(echo "$BADGES_FINAL" | jq -r '.[] | select(.nome == "Fiel da Navalha") | .desbloqueada')
BARBA_DE_RESPEITO_FINAL=$(echo "$BADGES_FINAL" | jq -r '.[] | select(.nome == "Barba de Respeito") | .desbloqueada')

if [ "$FIEL_NAVALHA" != "true" ] || [ "$BARBA_DE_RESPEITO_FINAL" != "true" ]; then
    echo "✘ TESTE FALHOU: Medalhas 'Fiel da Navalha' e 'Barba de Respeito' deveriam estar desbloqueadas após 5 cortes."
    exit 1
fi
echo "✔ Medalhas 'Fiel da Navalha' e 'Barba de Respeito' desbloqueadas com sucesso!"

XP_FINAL=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")
NIVEL_FINAL=$(db_exec "SELECT nivelatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")

if [ "$XP_FINAL" -ne 400 ] || [ "$NIVEL_FINAL" -ne 2 ]; then
    echo "✘ TESTE FALHOU: Progresso do cliente final deveria ser 400 XP e Nível 2. Obtido: XP=$XP_FINAL, Nível=$NIVEL_FINAL."
    exit 1
fi
echo "✔ Recálculo de progresso em cadeia e acúmulo de XP final validados com sucesso!"

# Limpar dados de teste
db_exec "DELETE FROM UsuarioBadges WHERE usuarioid IN ($CLI_ID);"
db_exec "DELETE FROM Agendamentos WHERE clienteid IN ($CLI_ID);"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN ($CLI_ID);"
db_exec "DELETE FROM Usuarios WHERE id IN ($CLI_ID);"
db_exec "DELETE FROM Usuarios WHERE login = 'admin_badge';"
db_exec "DELETE FROM Servicos WHERE id = $SERVICO_ID;"

echo "===== TODOS OS TESTES DO SISTEMA DE BADGES PASSARAM COM SUCESSO! ====="
