#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DOS FLUXOS DE CLÃS (CRIAÇÃO, CONVITE, ACEITE) ====="

# 1. Limpar registros anteriores de teste
db_exec "DELETE FROM ClaConvites WHERE claid IN (SELECT id FROM Clas WHERE nome = 'Cla Teste');"
db_exec "DELETE FROM ClaMembros WHERE claid IN (SELECT id FROM Clas WHERE nome = 'Cla Teste');"
db_exec "DELETE FROM Clas WHERE nome = 'Cla Teste';"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('lider_clan', 'convidado_clan'));"
db_exec "DELETE FROM Usuarios WHERE login IN ('lider_clan', 'convidado_clan');"

# 2. Registrar usuários de teste
echo "[+] Criando usuário Líder..."
LIDER_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"nome": "Lider Do Clan", "login": "lider_clan", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/register")
LIDER_TOKEN=$(echo "$LIDER_RESP" | jq -r '.token')
LIDER_ID=$(echo "$LIDER_RESP" | jq -r '.user.id')

echo "[+] Criando usuário Convidado..."
CONV_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"nome": "Convidado Do Clan", "login": "convidado_clan", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/register")
CONV_TOKEN=$(echo "$CONV_RESP" | jq -r '.token')
CONV_ID=$(echo "$CONV_RESP" | jq -r '.user.id')

# 3. Criar Clã
echo "[+] Criando Clã 'Cla Teste'..."
CREATE_RESP=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $LIDER_TOKEN" \
  -d '{"nome": "Cla Teste", "descricao": "Um clã de testes do RuivoBarber"}' \
  "$API_URL/api/v1/clas")
echo "Resposta Criação Clã: $CREATE_RESP"
CLA_ID=$(echo "$CREATE_RESP" | jq -r '.id')

if [ -z "$CLA_ID" ] || [ "$CLA_ID" == "null" ]; then
  echo "✘ TESTE FALHOU: Criação do clã falhou."
  exit 1
fi
echo "✔ Clã criado com sucesso! ID: $CLA_ID"

# 4. Tentar criar outro clã (deve falhar)
echo "[+] Testando restrição de possuir apenas um clã..."
FAIL_CREATE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $LIDER_TOKEN" \
  -d '{"nome": "Outro Clan", "descricao": "Tentativa inválida"}' \
  "$API_URL/api/v1/clas")

if [ "$FAIL_CREATE" -ne 400 ]; then
  echo "✘ TESTE FALHOU: Líder conseguiu criar um segundo clã (Status: $FAIL_CREATE, esperado: 400)."
  exit 1
fi
echo "✔ Restrição de clã único validada com sucesso!"

# 5. Enviar convite
echo "[+] Enviando convite do Líder para o Convidado..."
INVITE_RESP=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $LIDER_TOKEN" \
  -d "{\"convidadoId\": $CONV_ID}" \
  "$API_URL/api/v1/clas/convidar")
echo "Resposta Convite: $INVITE_RESP"
if [[ "$INVITE_RESP" != *"Convite enviado com sucesso!"* ]]; then
  echo "✘ TESTE FALHOU: Envio de convite falhou."
  exit 1
fi
echo "✔ Convite enviado com sucesso!"

# 6. Listar convites recebidos
echo "[+] Listando convites do convidado..."
LIST_INVITES=$(curl -s -H "Authorization: Bearer $CONV_TOKEN" "$API_URL/api/v1/clas/convites")
echo "Convites recebidos: $LIST_INVITES"
INVITE_ID=$(echo "$LIST_INVITES" | jq -r '.[0].id')

if [ -z "$INVITE_ID" ] || [ "$INVITE_ID" == "null" ]; then
  echo "✘ TESTE FALHOU: Nao listou o convite pendente."
  exit 1
fi
echo "✔ Convite listado com sucesso! ID: $INVITE_ID"

# 7. Aceitar convite
echo "[+] Aceitando o convite..."
ACCEPT_RESP=$(curl -s -X POST -H "Authorization: Bearer $CONV_TOKEN" "$API_URL/api/v1/clas/convites/$INVITE_ID/aceitar")
echo "Resposta Aceite: $ACCEPT_RESP"
if [[ "$ACCEPT_RESP" != *"Convite aceito com sucesso!"* ]]; then
  echo "✘ TESTE FALHOU: Aceitação do convite falhou."
  exit 1
fi
echo "✔ Convite aceito!"

# 8. Listar membros do clã
echo "[+] Listando membros do clã..."
MEMBERS_RESP=$(curl -s -H "Authorization: Bearer $LIDER_TOKEN" "$API_URL/api/v1/clas/$CLA_ID/membros")
echo "Membros do clã: $MEMBERS_RESP"

MEMBERS_COUNT=$(echo "$MEMBERS_RESP" | jq '. | length')
if [ "$MEMBERS_COUNT" -ne 2 ]; then
  echo "✘ TESTE FALHOU: O clã deveria ter 2 membros (Líder + Convidado), mas tem $MEMBERS_COUNT."
  exit 1
fi
echo "✔ Lista de membros contém ambos os usuários corretos!"

# 9. Limpar dados de teste
db_exec "DELETE FROM ClaConvites WHERE claid = $CLA_ID;"
db_exec "DELETE FROM ClaMembros WHERE claid = $CLA_ID;"
db_exec "DELETE FROM Clas WHERE id = $CLA_ID;"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN ($LIDER_ID, $CONV_ID);"
db_exec "DELETE FROM Usuarios WHERE id IN ($LIDER_ID, $CONV_ID);"

echo "===== TODOS OS TESTES DE CLÃS PASSARAM COM SUCESSO! ====="
