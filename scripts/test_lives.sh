#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DO SISTEMA DE LIVES E TRANSMISSÕES AO VIVO ====="

# 1. Limpar dados anteriores
echo "[+] Limpando banco de dados..."
db_exec "DELETE FROM Lives WHERE titulo LIKE 'Live de Teste%';"

# 2. Obter Token JWT de Admin
db_exec "DELETE FROM Usuarios WHERE login = 'test_lives_admin';"
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Admin Lives', 'Adm', 'test_lives_admin', 'pwd');"
# Como a senha precisa ser bcrypt, vamos atualizar para bcrypt para fazer login
db_exec "UPDATE Usuarios SET senha = '\$2a\$10\$placeholder_hash_trocar' WHERE login = 'test_lives_admin';"
# Wait, let's login with the default admin if easier, or seed a correct admin.
# Let's get login for the default 'admin' / 'admin'
AUTH_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "admin", "senha": "admin"}' "$API_URL/api/v1/auth/login")
TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "[-] Erro ao obter Token do Admin."
    exit 1
fi
echo "✔ Token do Admin obtido com sucesso."

# 3. Criar Live 1 (YouTube, Ativa = True)
echo "[+] Criando Live 1 (YouTube, Ativa = True)..."
CREATE_RESP1=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"titulo": "Live de Teste YouTube", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "plataforma": "YouTube", "ativa": true}' \
  "$API_URL/api/v1/lives")
echo "Resposta: $CREATE_RESP1"
LIVE1_ID=$(echo "$CREATE_RESP1" | jq -r '.id')
LIVE1_ATIVA=$(echo "$CREATE_RESP1" | jq -r '.ativa')

if [ "$LIVE1_ATIVA" != "true" ]; then
    echo "✘ TESTE FALHOU: Live 1 deveria estar ativa."
    exit 1
fi
echo "✔ Live 1 criada com ID: $LIVE1_ID"

# 4. Criar Live 2 (Twitch, Ativa = False)
echo "[+] Criando Live 2 (Twitch, Ativa = False)..."
CREATE_RESP2=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"titulo": "Live de Teste Twitch", "url": "https://twitch.tv/ninja", "plataforma": "Twitch", "ativa": false}' \
  "$API_URL/api/v1/lives")
echo "Resposta: $CREATE_RESP2"
LIVE2_ID=$(echo "$CREATE_RESP2" | jq -r '.id')
LIVE2_ATIVA=$(echo "$CREATE_RESP2" | jq -r '.ativa')

if [ "$LIVE2_ATIVA" != "false" ]; then
    echo "✘ TESTE FALHOU: Live 2 deveria estar inativa."
    exit 1
fi
echo "✔ Live 2 criada com ID: $LIVE2_ID"

# 5. Buscar live ativa (deve ser a Live 1 - YouTube)
echo "[+] Buscando live ativa..."
ACTIVE_RESP=$(curl -s -X GET -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/lives/ativa")
echo "Resposta: $ACTIVE_RESP"
ACTIVE_ID=$(echo "$ACTIVE_RESP" | jq -r '.id')

if [ "$ACTIVE_ID" != "$LIVE1_ID" ]; then
    echo "✘ TESTE FALHOU: Live ativa deveria ser a ID $LIVE1_ID (YouTube), obtida: $ACTIVE_ID."
    exit 1
fi
echo "✔ Live ativa validada com sucesso!"

# 6. Listar todas as lives (deve conter as duas)
echo "[+] Listando todas as lives..."
LIST_RESP=$(curl -s -X GET -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/lives")
COUNT=$(echo "$LIST_RESP" | jq '. | length')
if [ "$COUNT" -lt 2 ]; then
    echo "✘ TESTE FALHOU: Deveria retornar pelo menos 2 lives, retornou: $COUNT."
    exit 1
fi
echo "✔ Lista de lives validada com sucesso! Quantidade: $COUNT"

# 7. Ativar Live 2 (Twitch)
echo "[+] Ativando Live 2 (Twitch)..."
ACTIVATE_RESP=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/lives/$LIVE2_ID/ativar")
echo "Resposta: $ACTIVATE_RESP"

# Validar se a Live 2 é a nova ativa e a Live 1 foi desativada
echo "[+] Validando se a Live 2 se tornou a ativa..."
ACTIVE_RESP2=$(curl -s -X GET -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/lives/ativa")
echo "Resposta: $ACTIVE_RESP2"
ACTIVE_ID2=$(echo "$ACTIVE_RESP2" | jq -r '.id')

if [ "$ACTIVE_ID2" != "$LIVE2_ID" ]; then
    echo "✘ TESTE FALHOU: Live ativa deveria ser a ID $LIVE2_ID (Twitch), obtida: $ACTIVE_ID2."
    exit 1
fi
echo "✔ Live 2 agora é a ativa!"

# Validar se a Live 1 foi desativada no banco
LIVE1_STATUS_DB=$(db_exec "SELECT ativa FROM Lives WHERE id = $LIVE1_ID;")
if [ "$LIVE1_STATUS_DB" != "f" ] && [ "$LIVE1_STATUS_DB" != "false" ]; then
    echo "✘ TESTE FALHOU: A Live 1 deveria ter sido desativada (Status = false) após ativar a Live 2. Obtido: $LIVE1_STATUS_DB."
    exit 1
fi
echo "✔ Live 1 desativada com sucesso no banco de dados."

# 8. Excluir as duas lives
echo "[+] Excluindo lives de teste..."
DEL_RESP1=$(curl -s -H "Authorization: Bearer $TOKEN" -X DELETE "$API_URL/api/v1/lives/$LIVE1_ID")
DEL_RESP2=$(curl -s -H "Authorization: Bearer $TOKEN" -X DELETE "$API_URL/api/v1/lives/$LIVE2_ID")
echo "Respostas exclusão: $DEL_RESP1 | $DEL_RESP2"

# 9. Validar se não há mais nenhuma live ativa
echo "[+] Verificando se o endpoint de live ativa retorna 404..."
ACTIVE_RESP3=$(curl -s -o /dev/null -w "%{http_code}" -X GET -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/lives/ativa")
if [ "$ACTIVE_RESP3" != "404" ]; then
    echo "✘ TESTE FALHOU: O status HTTP deveria ser 404 após excluir as lives, obtido: $ACTIVE_RESP3."
    exit 1
fi
echo "✔ Validação pós-exclusão concluída (404 retornado)."

# Limpeza final
db_exec "DELETE FROM Usuarios WHERE login = 'test_lives_admin';"

echo "===== TODOS OS TESTES DO SISTEMA DE LIVES PASSARAM COM SUCESSO! ====="
