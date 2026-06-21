#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DE ROLLBACK (TRANSACTION LOCK) ====="

# 1. Limpar dados anteriores e preparar massa de testes
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_xp_cli');"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_xp_cli');"
db_exec "DELETE FROM Usuarios WHERE login = 'test_xp_cli';"
db_exec "DELETE FROM ServicoProdutos WHERE servicoid = 1;"
db_exec "DELETE FROM Produtos WHERE nome = 'Shampoo Premium';"

# 2. Inserir Cliente e Barbeiro
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente RPG', 'Cliente', 'test_xp_cli', 'pwd');"
CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_xp_cli';")

# 2b. Inserir Administrador para autenticação do teste e obter token JWT
db_exec "DELETE FROM Usuarios WHERE login = 'test_admin';"
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Test Admin', 'Adm', 'test_admin', 'pwd');"
AUTH_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_admin", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')

# 3. Inserir Produto e mapear ao Serviço 1 (Corte Simples, recompensa 10 XP)
# Estoque inicial de Shampoo Premium = 1
db_exec "INSERT INTO Produtos (nome, quantidade) VALUES ('Shampoo Premium', 1);"
PROD_ID=$(db_exec "SELECT id FROM Produtos WHERE nome='Shampoo Premium';")
db_exec "INSERT INTO ServicoProdutos (servicoid, produtoid, quantidadenecessaria) VALUES (1, $PROD_ID, 1);"

# 4. Criar dois Agendamentos para o Cliente RPG
BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE cargo='Barbeiro' LIMIT 1;")
if [ -z "$BARBEIRO_ID" ]; then
    # Se não houver barbeiro, cadastrar um
    db_exec "INSERT INTO Usuarios (nome, cargo, login, senha, comissao) VALUES ('Barbeiro RPG', 'Barbeiro', 'test_xp_barb', 'pwd', 30.00);"
    BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_xp_barb';")
fi

db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI_ID, $BARBEIRO_ID, 1, NOW() + INTERVAL '1 hour', 'Confirmado');"
AGEN1_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI_ID ORDER BY id ASC LIMIT 1;")

db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI_ID, $BARBEIRO_ID, 1, NOW() + INTERVAL '2 hours', 'Confirmado');"
AGEN2_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI_ID ORDER BY id DESC LIMIT 1;")

echo "Criado Cliente ID: $CLI_ID, Produto ID: $PROD_ID"
echo "Agendamento 1: $AGEN1_ID, Agendamento 2: $AGEN2_ID"

# 5. TESTE 1: Concluir o Agendamento 1 (Estoque disponível = 1, necessário = 1)
echo "Executando Conclusão do Agendamento 1..."
RESP1=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN1_ID}" "$API_URL/api/v1/atendimentos/concluir")
echo "Resposta 1: $RESP1"

# Verificar estoque, status e XP do cliente
ESTOQUE_ATUAL=$(db_exec "SELECT quantidade FROM Produtos WHERE id=$PROD_ID;")
STATUS_AGEN1=$(db_exec "SELECT status FROM Agendamentos WHERE id=$AGEN1_ID;")
XP_CLIENTE=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")

echo "Estoque após Teste 1 (esperado 0): $ESTOQUE_ATUAL"
echo "Status Agendamento 1 (esperado Concluido): $STATUS_AGEN1"
echo "XP Cliente (esperado 10 ou 60): $XP_CLIENTE"

if [ "$ESTOQUE_ATUAL" -eq 0 ] && [ "$STATUS_AGEN1" == "Concluido" ] && { [ "$XP_CLIENTE" -eq 10 ] || [ "$XP_CLIENTE" -eq 60 ]; }; then
    echo "✔ TESTE 1 PASSOU: Conclusão e dedução normais de estoque e XP ok."
else
    echo "✘ TESTE 1 FALHOU!"
    exit 1
fi

# 6. TESTE 2: Concluir o Agendamento 2 (Estoque atual = 0, necessário = 1)
# Deverá falhar e dar Rollback total na transação
echo "Executando Conclusão do Agendamento 2 (deverá falhar por estoque)..."
RESP2=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN2_ID}" "$API_URL/api/v1/atendimentos/concluir")
echo "Resposta 2: $RESP2"

# Verificar que nada foi alterado para o Agendamento 2 e o XP do cliente
ESTOQUE_ATUAL2=$(db_exec "SELECT quantidade FROM Produtos WHERE id=$PROD_ID;")
STATUS_AGEN2=$(db_exec "SELECT status FROM Agendamentos WHERE id=$AGEN2_ID;")
XP_CLIENTE2=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLI_ID;")

echo "Estoque após Teste 2 (esperado 0): $ESTOQUE_ATUAL2"
echo "Status Agendamento 2 (esperado Confirmado): $STATUS_AGEN2"
echo "XP Cliente após Teste 2 (esperado $XP_CLIENTE - sem acréscimo): $XP_CLIENTE2"

if [ "$ESTOQUE_ATUAL2" -eq 0 ] && [ "$STATUS_AGEN2" == "Confirmado" ] && [ "$XP_CLIENTE2" -eq "$XP_CLIENTE" ]; then
    echo "✔ TESTE 2 PASSOU: Transação deu Rollback corretamente. XP não subiu e status não alterou."
else
    echo "✘ TESTE 2 FALHOU! Rollback falhou ou dados foram alterados incorretamente."
    exit 1
fi

echo "===== TODOS OS TESTES DE TRANSACTION LOCK PASSARAM COM SUCESSO ====="
