#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DA LOJA DE ITENS VIRTUAIS RPG ====="

# 1. Limpar dados anteriores de teste
db_exec "DELETE FROM UsuarioItens WHERE usuarioid IN (SELECT id FROM Usuarios WHERE login = 'test_store_cli');"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_store_cli');"
db_exec "DELETE FROM Usuarios WHERE login IN ('test_store_cli', 'admin_store');"

# 2. Registrar usuários e obter tokens
echo "[+] Criando usuário Cliente..."
CLI_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"nome": "Cliente Loja", "login": "test_store_cli", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/register")
CLI_TOKEN=$(echo "$CLI_RESP" | jq -r '.token')
CLI_ID=$(echo "$CLI_RESP" | jq -r '.user.id')

echo "[+] Criando usuário Admin..."
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Admin Loja', 'Adm', 'admin_store', 'pwd');"
ADMIN_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"login": "admin_store", "senha": "pwd"}' \
  "$API_URL/api/v1/auth/login")
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | jq -r '.token')

# 3. Teste inicial: verificar itens da loja (todos bloqueados)
echo "[+] Buscando itens da loja inicialmente (/api/v1/loja/itens)..."
LOJA_INIT=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/loja/itens")
echo "Loja Inicial: $LOJA_INIT"

COMPRADOS_COUNT=$(echo "$LOJA_INIT" | jq '[.[] | select(.comprado == true)] | length')
MOLDURA_ID=$(echo "$LOJA_INIT" | jq -r '.[] | select(.nome == "Moldura de Ouro") | .id')
FOGO_ID=$(echo "$LOJA_INIT" | jq -r '.[] | select(.nome == "Fundo Neon de Fogo") | .id')
GELO_ID=$(echo "$LOJA_INIT" | jq -r '.[] | select(.nome == "Fundo Neon de Gelo") | .id')

if [ "$COMPRADOS_COUNT" -ne 0 ]; then
    echo "✘ TESTE FALHOU: O usuário novo não deveria possuir itens comprados."
    exit 1
fi
echo "✔ Inicialização da loja validada."

# 4. Verificar saldo de moedas inicial (deve ser 0)
echo "[+] Buscando perfil do cliente para checar moedas..."
PERFIL_INIT=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/clientes/$CLI_ID")
MOEDAS_INIT=$(echo "$PERFIL_INIT" | jq -r '.moedas')
echo "Moedas Iniciais: $MOEDAS_INIT"

if [ "$MOEDAS_INIT" -ne 0 ]; then
    echo "✘ TESTE FALHOU: O saldo inicial de moedas deveria ser 0."
    exit 1
fi
echo "✔ Saldo inicial de 0 moedas validado."

# 5. Tentar comprar "Moldura de Ouro" sem saldo (deve falhar)
echo "[+] Tentando comprar Moldura de Ouro (ID $MOLDURA_ID) sem moedas..."
COMPRA_FAIL=$(curl -s -X POST -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/loja/itens/$MOLDURA_ID/comprar")
echo "Resposta Compra sem moedas: $COMPRA_FAIL"

if [[ "$COMPRA_FAIL" != *"saldo de moedas insuficiente"* ]]; then
    echo "✘ TESTE FALHOU: Deveria dar erro de saldo insuficiente."
    exit 1
fi
echo "✔ Restrição de saldo insuficiente validada com sucesso!"

# 6. Conceder moedas ao usuário via banco
echo "[+] Concedendo 600 moedas ao cliente via Banco de Dados..."
db_exec "UPDATE ProgressoCliente SET moedas = 600 WHERE clienteid = $CLI_ID;"

# 7. Comprar "Moldura de Ouro" (ID $MOLDURA_ID, custo 200)
echo "[+] Comprando Moldura de Ouro..."
COMPRA_OK=$(curl -s -X POST -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/loja/itens/$MOLDURA_ID/comprar")
echo "Resposta Compra: $COMPRA_OK"

if [[ "$COMPRA_OK" != *"Item comprado com sucesso!"* ]]; then
    echo "✘ TESTE FALHOU: Compra do item falhou."
    exit 1
fi

# Validar moedas restantes e posse do item (deve ter 400 moedas, comprado: true, equipado: false)
PERFIL_MID=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/clientes/$CLI_ID")
MOEDAS_MID=$(echo "$PERFIL_MID" | jq -r '.moedas')
MOLDURA_EQ=$(echo "$PERFIL_MID" | jq -r '.molduraEquipada')

if [ "$MOEDAS_MID" -ne 400 ] || [ "$MOLDURA_EQ" != "" ]; then
    echo "✘ TESTE FALHOU: Moedas deveriam ser 400 e molduraEquipada deveria ser vazia. Obtido: Moedas=$MOEDAS_MID, Moldura=$MOLDURA_EQ"
    exit 1
fi
echo "✔ Compra efetuada e saldo de 400 moedas validado!"

# 8. Equipar "Moldura de Ouro"
echo "[+] Equipando Moldura de Ouro..."
EQUIP_OK=$(curl -s -X POST -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/loja/itens/$MOLDURA_ID/equipar")
echo "Resposta Equipar: $EQUIP_OK"

if [[ "$EQUIP_OK" != *"Item equipado com sucesso!"* ]]; then
    echo "✘ TESTE FALHOU: Equipamento do item falhou."
    exit 1
fi

PERFIL_EQ=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/clientes/$CLI_ID")
MOLDURA_EQ_ATUAL=$(echo "$PERFIL_EQ" | jq -r '.molduraEquipada')

if [ "$MOLDURA_EQ_ATUAL" != "frame-gold" ]; then
    echo "✘ TESTE FALHOU: molduraEquipada deveria ser 'frame-gold'. Obtido: $MOLDURA_EQ_ATUAL"
    exit 1
fi
echo "✔ Item equipado com sucesso no perfil do jogador!"

# 9. Comprar "Fundo Neon de Fogo" (ID $FOGO_ID, custo 350) e Equipar
echo "[+] Comprando Fundo Neon de Fogo..."
curl -s -o /dev/null -X POST -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/loja/itens/$FOGO_ID/comprar"
echo "[+] Equipando Fundo Neon de Fogo..."
curl -s -o /dev/null -X POST -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/loja/itens/$FOGO_ID/equipar"

PERFIL_FOGO=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/clientes/$CLI_ID")
FUNDO_EQ_FOGO=$(echo "$PERFIL_FOGO" | jq -r '.fundoEquipado')
MOEDAS_FOGO=$(echo "$PERFIL_FOGO" | jq -r '.moedas')

if [ "$FUNDO_EQ_FOGO" != "bg-neon-fire" ] || [ "$MOEDAS_FOGO" -ne 50 ]; then
    echo "✘ TESTE FALHOU: Fundo deveria ser 'bg-neon-fire' e saldo de moedas deveria ser 50. Obtido: Fundo=$FUNDO_EQ_FOGO, Moedas=$MOEDAS_FOGO"
    exit 1
fi
echo "✔ Fundo Neon de Fogo equipado com sucesso! Saldo restante: 50 moedas."

# 10. Testar substituição automática (equipar "Fundo Neon de Gelo" desequipa "Fundo Neon de Fogo")
# Dar mais moedas
db_exec "UPDATE ProgressoCliente SET moedas = 400 WHERE clienteid = $CLI_ID;"
echo "[+] Comprando Fundo Neon de Gelo..."
curl -s -o /dev/null -X POST -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/loja/itens/$GELO_ID/comprar"
echo "[+] Equipando Fundo Neon de Gelo..."
curl -s -o /dev/null -X POST -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/loja/itens/$GELO_ID/equipar"

PERFIL_GELO=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/clientes/$CLI_ID")
FUNDO_EQ_GELO=$(echo "$PERFIL_GELO" | jq -r '.fundoEquipado')

if [ "$FUNDO_EQ_GELO" != "bg-neon-ice" ]; then
    echo "✘ TESTE FALHOU: Fundo equipado deveria ser 'bg-neon-ice'. Obtido: $FUNDO_EQ_GELO"
    exit 1
fi

# Verificar na lista de itens que o fogo foi desequipado e o gelo foi equipado
LOJA_FINAL=$(curl -s -H "Authorization: Bearer $CLI_TOKEN" "$API_URL/api/v1/loja/itens")
FOGO_EQ_STATE=$(echo "$LOJA_FINAL" | jq -r ".[] | select(.id == $FOGO_ID) | .equipado")
GELO_EQ_STATE=$(echo "$LOJA_FINAL" | jq -r ".[] | select(.id == $GELO_ID) | .equipado")

if [ "$FOGO_EQ_STATE" != "false" ] || [ "$GELO_EQ_STATE" != "true" ]; then
    echo "✘ TESTE FALHOU: Fogo deveria estar false e Gelo deveria estar true. Obtido: Fogo=$FOGO_EQ_STATE, Gelo=$GELO_EQ_STATE"
    exit 1
fi
echo "✔ Regra de substituição automática (1 item do mesmo tipo equipado por vez) validada com sucesso!"

# Limpar dados de teste
db_exec "DELETE FROM UsuarioItens WHERE usuarioid IN ($CLI_ID);"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN ($CLI_ID);"
db_exec "DELETE FROM Usuarios WHERE id IN ($CLI_ID);"
db_exec "DELETE FROM Usuarios WHERE login = 'admin_store';"

echo "===== TODOS OS TESTES DA LOJA DE ITENS VIRTUAIS RPG PASSARAM COM SUCESSO! ====="
