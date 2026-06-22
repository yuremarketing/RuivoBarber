#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DE SUBIDA DE NÍVEL DE CLÃS (XP COLETIVO) ====="

# 1. Limpar dados anteriores de teste
db_exec "DELETE FROM ClaConvites WHERE claid IN (SELECT id FROM Clas WHERE nome = 'Cla Nivel Up Teste');"
db_exec "DELETE FROM ClaMembros WHERE claid IN (SELECT id FROM Clas WHERE nome = 'Cla Nivel Up Teste');"
db_exec "DELETE FROM Clas WHERE nome = 'Cla Nivel Up Teste';"
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('lider_lvlup', 'membro_lvlup'));"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('lider_lvlup', 'membro_lvlup'));"
db_exec "DELETE FROM Usuarios WHERE login IN ('lider_lvlup', 'membro_lvlup', 'admin_lvlup');"

CURRENT_WEEK=$(date +'%Y-W%V')
ACTIVE_MISSIONS=$(db_exec "SELECT missaoid FROM ClaMissoesSemanais WHERE semanaano = '$CURRENT_WEEK';" || echo "")
db_exec "DELETE FROM ClaMissoesSemanais WHERE semanaano = '$CURRENT_WEEK';"


# 2. Registrar usuários e obter tokens
echo "[+] Criando usuário Líder..."
LIDER_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"nome": "Lider LvlUp", "login": "lider_lvlup", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/register")
LIDER_TOKEN=$(echo "$LIDER_RESP" | jq -r '.token')
LIDER_ID=$(echo "$LIDER_RESP" | jq -r '.user.id')

echo "[+] Criando usuário Membro..."
MEMBRO_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"nome": "Membro LvlUp", "login": "membro_lvlup", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/register")
MEMBRO_TOKEN=$(echo "$MEMBRO_RESP" | jq -r '.token')
MEMBRO_ID=$(echo "$MEMBRO_RESP" | jq -r '.user.id')

echo "[+] Criando usuário Admin..."
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Admin LvlUp', 'Adm', 'admin_lvlup', 'pwd');"
ADMIN_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"login": "admin_lvlup", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/login")
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | jq -r '.token')

# 3. Criar Clã e associar membros
echo "[+] Criando Clã 'Cla Nivel Up Teste'..."
CREATE_RESP=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $LIDER_TOKEN" \
  -d '{"nome": "Cla Nivel Up Teste", "descricao": "Clã para testar subida de nível coletiva"}' \
  "$API_URL/api/v1/clas")
CLA_ID=$(echo "$CREATE_RESP" | jq -r '.id')
echo "Clã criado com ID: $CLA_ID"

echo "[+] Adicionando Membro ao Clã via Banco..."
db_exec "INSERT INTO ClaMembros (usuarioid, claid, cargo) VALUES ($MEMBRO_ID, $CLA_ID, 'Membro');"

# 4. Obter barbeiro e serviço para agendamento
BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE cargo='Barbeiro' LIMIT 1;")
if [ -z "$BARBEIRO_ID" ]; then
    db_exec "INSERT INTO Usuarios (nome, cargo, login, senha, comissao) VALUES ('Barbeiro Test LvlUp', 'Barbeiro', 'test_lvlup_barb', 'pwd', 30.00);"
    BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_lvlup_barb';")
fi

# Garantir que temos um serviço com ID 1 ou obter o primeiro
SERVICO_ID=$(db_exec "SELECT id FROM Servicos LIMIT 1;")
if [ -z "$SERVICO_ID" ]; then
    db_exec "INSERT INTO Servicos (nome, preco, duracaominutos, xprecompensa) VALUES ('Corte Simples', 50.00, 30, 50);"
    SERVICO_ID=$(db_exec "SELECT id FROM Servicos WHERE nome='Corte Simples' LIMIT 1;")
fi

# 5. Teste: Consultar Clã inicialmente
echo "[+] Consultando Clã inicialmente (/api/v1/clas/me)..."
CLA_ME_RESP=$(curl -s -H "Authorization: Bearer $LIDER_TOKEN" "$API_URL/api/v1/clas/me")
echo "Clã Inicial: $CLA_ME_RESP"
XP_INICIAL=$(echo "$CLA_ME_RESP" | jq -r '.xpColetivo')
NIVEL_INICIAL=$(echo "$CLA_ME_RESP" | jq -r '.nivelAtual')

if [ "$XP_INICIAL" -ne 0 ] || [ "$NIVEL_INICIAL" -ne 1 ]; then
    echo "✘ TESTE FALHOU: Clã deveria iniciar com 0 XP e Nível 1"
    exit 1
fi
echo "✔ Clã iniciado corretamente com 0 XP e Nível 1"

# 6. Agendar e concluir primeiro atendimento (deve somar 1 XP ao Clã)
echo "[+] Agendando corte para o Membro..."
db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($MEMBRO_ID, $BARBEIRO_ID, $SERVICO_ID, NOW() + INTERVAL '1 hour', 'Confirmado');"
AGEN_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$MEMBRO_ID ORDER BY id DESC LIMIT 1;")

echo "[+] Concluindo atendimento (ID: $AGEN_ID)..."
CONCLUIR_RESP=$(curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d "{\"agendamento_id\": $AGEN_ID}" \
  "$API_URL/api/v1/atendimentos/concluir")
echo "Resposta Concluir: $CONCLUIR_RESP"

echo "[+] Consultando Clã após 1 atendimento..."
CLA_ME_RESP=$(curl -s -H "Authorization: Bearer $LIDER_TOKEN" "$API_URL/api/v1/clas/me")
echo "Clã após 1 corte: $CLA_ME_RESP"
XP_ATUAL=$(echo "$CLA_ME_RESP" | jq -r '.xpColetivo')
NIVEL_ATUAL=$(echo "$CLA_ME_RESP" | jq -r '.nivelAtual')

if [ "$XP_ATUAL" -ne 1 ] || [ "$NIVEL_ATUAL" -ne 1 ]; then
    echo "✘ TESTE FALHOU: Clã deveria ter 1 XP e Nível 1"
    exit 1
fi
echo "✔ Primeiro ganho de XP do Clã validado (1 XP, Nível 1)"

# 7. Simular mais 9 atendimentos concluídos para subir de nível (Total de 10 XP -> Nível 2)
echo "[+] Simulando mais 9 atendimentos para atingir 10 XP (Nível 2)..."
for i in {1..9}; do
    db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($MEMBRO_ID, $BARBEIRO_ID, $SERVICO_ID, NOW() + INTERVAL '$((i+1)) hours', 'Confirmado');"
    AGEN_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$MEMBRO_ID ORDER BY id DESC LIMIT 1;")
    curl -s -o /dev/null -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
      -d "{\"agendamento_id\": $AGEN_ID}" \
      "$API_URL/api/v1/atendimentos/concluir"
done

echo "[+] Consultando Clã após 10 atendimentos..."
CLA_ME_RESP=$(curl -s -H "Authorization: Bearer $LIDER_TOKEN" "$API_URL/api/v1/clas/me")
echo "Clã após 10 cortes: $CLA_ME_RESP"
XP_ATUAL=$(echo "$CLA_ME_RESP" | jq -r '.xpColetivo')
NIVEL_ATUAL=$(echo "$CLA_ME_RESP" | jq -r '.nivelAtual')

if [ "$XP_ATUAL" -ne 10 ] || [ "$NIVEL_ATUAL" -ne 2 ]; then
    echo "✘ TESTE FALHOU: Clã deveria ter 10 XP e ter subido para o Nível 2"
    exit 1
fi
echo "✔ Subida para Nível 2 validada com sucesso (10 XP, Nível 2)!"

# 8. Limpeza de dados de teste
db_exec "DELETE FROM ClaConvites WHERE claid = $CLA_ID;"
db_exec "DELETE FROM ClaMembros WHERE claid = $CLA_ID;"
db_exec "DELETE FROM Clas WHERE id = $CLA_ID;"
db_exec "DELETE FROM Agendamentos WHERE clienteid IN ($LIDER_ID, $MEMBRO_ID);"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN ($LIDER_ID, $MEMBRO_ID);"
db_exec "DELETE FROM Usuarios WHERE id IN ($LIDER_ID, $MEMBRO_ID);"
db_exec "DELETE FROM Usuarios WHERE login = 'admin_lvlup';"

if [ -n "$ACTIVE_MISSIONS" ]; then
    for missao_id in $ACTIVE_MISSIONS; do
        db_exec "INSERT INTO ClaMissoesSemanais (semanaano, missaoid) VALUES ('$CURRENT_WEEK', $missao_id);"
    done
fi

echo "===== TESTE DE SUBIDA DE NÍVEL DE CLÃS PASSOU COM SUCESSO! ====="
