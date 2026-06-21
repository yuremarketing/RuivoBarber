#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTES DO RANKING, MURAL E BUSCA DE CLÃS ====="

# 1. Limpeza
echo "[+] Limpando dados..."
db_exec "DELETE FROM ClaMural WHERE claid IN (SELECT id FROM Clas WHERE nome LIKE 'Guilda Teste%');"
db_exec "DELETE FROM ClaMembros WHERE claid IN (SELECT id FROM Clas WHERE nome LIKE 'Guilda Teste%');"
db_exec "DELETE FROM Clas WHERE nome LIKE 'Guilda Teste%';"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('lider_test_f', 'membro_test_f'));"
db_exec "DELETE FROM Usuarios WHERE login IN ('lider_test_f', 'membro_test_f');"

# 2. Registrar usuários
echo "[+] Registrando jogadores de teste..."
LIDER_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"nome": "Lider Teste", "login": "lider_test_f", "senha": "pwd"}' "$API_URL/api/v1/auth/register")
LIDER_TOKEN=$(echo "$LIDER_RESP" | jq -r '.token')
LIDER_ID=$(echo "$LIDER_RESP" | jq -r '.user.id')

MEMBRO_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"nome": "Membro Teste", "login": "membro_test_f", "senha": "pwd"}' "$API_URL/api/v1/auth/register")
MEMBRO_TOKEN=$(echo "$MEMBRO_RESP" | jq -r '.token')
MEMBRO_ID=$(echo "$MEMBRO_RESP" | jq -r '.user.id')

# 3. Teste Busca de Jogadores sem Clã (deve listar 'Membro Teste')
echo "[+] Executando Teste 1: Busca de jogadores sem clã..."
SEARCH_RESP=$(curl -s -H "Authorization: Bearer $LIDER_TOKEN" "$API_URL/api/v1/jogadores/busca?query=membro_test_f")
echo "Resposta: $SEARCH_RESP"
FOUND_ID=$(echo "$SEARCH_RESP" | jq -r '.[0].id')

if [ "$FOUND_ID" != "$MEMBRO_ID" ]; then
  echo "✘ TESTE FALHOU: Busca não encontrou o jogador 'membro_test_f'."
  exit 1
fi
echo "✔ Teste 1 passou: Jogador sem clã foi listado corretamente."

# 4. Criar Clã
echo "[+] Criando Clã 'Guilda Teste Alfa'..."
CREATE_RESP=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $LIDER_TOKEN" \
  -d '{"nome": "Guilda Teste Alfa", "descricao": "Primeira guilda de teste"}' \
  "$API_URL/api/v1/clas")
echo "Resposta: $CREATE_RESP"
CLA_ID=$(echo "$CREATE_RESP" | jq -r '.id')

# Atualizar o clã para ter nível 5 e 1200 XP para testar o Ranking
db_exec "UPDATE Clas SET nivelatual = 5, xpcoletivo = 1200 WHERE id = $CLA_ID;"

# 5. Listar e validar Leaderboard (Ranking)
echo "[+] Executando Teste 2: Listar ranking de clãs..."
RANK_RESP=$(curl -s -H "Authorization: Bearer $LIDER_TOKEN" "$API_URL/api/v1/clas")
echo "Resposta: $RANK_RESP"
TOP_RANK_NAME=$(echo "$RANK_RESP" | jq -r '.[0].nome')

if [ "$TOP_RANK_NAME" != "Guilda Teste Alfa" ]; then
  echo "✘ TESTE FALHOU: Clã 'Guilda Teste Alfa' deveria liderar o ranking (Nível 5)."
  exit 1
fi
echo "✔ Teste 2 passou: Ranking de clãs validado (Nível 5 no topo)."

# 6. Mural de Recados (Postar Mensagem)
echo "[+] Executando Teste 3: Postar mensagem no mural do clã..."
MURAL_POST_RESP=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $LIDER_TOKEN" \
  -d '{"mensagem": "Mensagem secreta do Lider!"}' \
  "$API_URL/api/v1/clas/me/mural")
echo "Resposta Post: $MURAL_POST_RESP"

MSG_ID=$(echo "$MURAL_POST_RESP" | jq -r '.id')
if [ -z "$MSG_ID" ] || [ "$MSG_ID" == "null" ]; then
  echo "✘ TESTE FALHOU: Falha ao cadastrar mensagem no mural."
  exit 1
fi
echo "✔ Mensagem criada com ID: $MSG_ID"

# 7. Mural de Recados (Obter Mensagens)
echo "[+] Executando Teste 4: Obter mensagens do mural..."
MURAL_GET_RESP=$(curl -s -H "Authorization: Bearer $LIDER_TOKEN" "$API_URL/api/v1/clas/me/mural")
echo "Resposta Get: $MURAL_GET_RESP"
MSG_CONTENT=$(echo "$MURAL_GET_RESP" | jq -r '.[0].mensagem')
MSG_SENDER=$(echo "$MURAL_GET_RESP" | jq -r '.[0].nomeUsuario')

if [ "$MSG_CONTENT" != "Mensagem secreta do Lider!" ] || [ "$MSG_SENDER" != "Lider Teste" ]; then
  echo "✘ TESTE FALHOU: Mensagem retornada ou autor estão incorretos."
  exit 1
fi
echo "✔ Teste 4 passou: Mensagem do mural lida com sucesso!"

# 8. Tentar postar no mural sem pertencer a um clã (Membro Teste)
echo "[+] Executando Teste 5: Bloquear postagens de não-membros..."
FAIL_POST=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $MEMBRO_TOKEN" \
  -d '{"mensagem": "Invasão!"}' \
  "$API_URL/api/v1/clas/me/mural")

if [ "$FAIL_POST" -ne 400 ]; then
  echo "✘ TESTE FALHOU: Não-membro conseguiu postar no mural (Status: $FAIL_POST, esperado: 400)."
  exit 1
fi
echo "✔ Teste 5 passou: Bloqueio de segurança de mural validado!"

# 9. Limpeza final
echo "[+] Efetuando limpeza final..."
db_exec "DELETE FROM ClaMural WHERE claid = $CLA_ID;"
db_exec "DELETE FROM ClaMembros WHERE claid = $CLA_ID;"
db_exec "DELETE FROM Clas WHERE id = $CLA_ID;"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN ($LIDER_ID, $MEMBRO_ID);"
db_exec "DELETE FROM Usuarios WHERE id IN ($LIDER_ID, $MEMBRO_ID);"

echo "===== TODOS OS TESTES DOS NOVOS RECURSOS DE CLÃS PASSARAM COM SUCESSO! ====="
