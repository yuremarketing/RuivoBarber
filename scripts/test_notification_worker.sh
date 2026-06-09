#!/usr/bin/env bash
set -euo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE DE NOTIFICATION WORKER & PROVA SOCIAL ====="

# 1. Limpar dados anteriores
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_notif_cli');"
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'test_notif_cli');"
db_exec "DELETE FROM Usuarios WHERE login = 'test_notif_cli';"
db_exec "DELETE FROM ServicoProdutos WHERE servicoid = 1;"

# 2. Inserir Cliente de Teste com 550 XP (Nível 2 / Barba de Respeito)
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Notificacao RPG', 'Cliente', 'test_notif_cli', 'pwd');"
CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_notif_cli';")
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLI_ID, 550, 2, 91.67);"

# 3. Criar Agendamento para serviço com 50 XP de recompensa
# (Corte + Barba tem recompensa de 25 XP, vamos usar o Serviço 4 - Hidratação Capilar que tem 20 XP, ou atualizar a recompensa do serviço 1 para 50 XP temporariamente no teste)
# Vamos atualizar a recompensa do Serviço 1 (Corte Simples) para 50 XP
db_exec "UPDATE Servicos SET xprecompensa = 50 WHERE id = 1;"
db_exec "UPDATE Produtos SET quantidade = 100 WHERE id = 1;"

BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE cargo='Barbeiro' LIMIT 1;")
if [ -z "$BARBEIRO_ID" ]; then
    db_exec "INSERT INTO Usuarios (nome, cargo, login, senha, comissao) VALUES ('Barbeiro Test', 'Barbeiro', 'test_notif_barb', 'pwd', 30.00);"
    BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='test_notif_barb';")
fi

db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLI_ID, $BARBEIRO_ID, 1, NOW() + INTERVAL '1 hour', 'Confirmado');"
AGEN_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLI_ID ORDER BY id DESC LIMIT 1;")

echo "Criado Cliente ID: $CLI_ID (550 XP), Agendamento ID: $AGEN_ID"

# Obter Token JWT do Administrador para autenticação
db_exec "DELETE FROM Usuarios WHERE login = 'test_admin';"
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Test Admin', 'Adm', 'test_admin', 'pwd');"
AUTH_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "test_admin", "senha": "pwd"}' "$API_URL/api/v1/auth/login")
TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')

# 4. Chamar conclusão de atendimento (irá somar +50 XP = 600 XP -> Nível 3 Lenda da Navalha)
echo "Concluindo atendimento..."
RESP=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"agendamento_id\": $AGEN_ID}" "$API_URL/api/v1/atendimentos/concluir")
echo "Resposta API: $RESP"

# Restaurar recompensa padrão do serviço 1
db_exec "UPDATE Servicos SET xprecompensa = 10 WHERE id = 1;"

# Aguardar 2 segundos para o worker assíncrono processar a mensagem
echo "Aguardando processamento assíncrono..."
sleep 2

# 5. Buscar logs do contêiner e validar se a mensagem correta foi registrada
echo "Validando logs do contêiner backend..."
CONTAINER_LOGS=$(docker compose logs backend --tail 30)

if echo "$CONTAINER_LOGS" | grep -q "Lenda da Navalha" && echo "$CONTAINER_LOGS" | grep -q "https://g.page/r/ruivobarber/review"; then
    echo "✔ TESTE PASSOU: Mensagem enviada pelo NotificationWorker contendo o link do Google Meu Negócio!"
else
    echo "✘ TESTE FALHOU! O log do worker não continha a prova social ou a mensagem esperada."
    echo "Logs recentes:"
    echo "$CONTAINER_LOGS"
    exit 1
fi

echo "===== TESTE DE NOTIFICATION WORKER CONCLUÍDO COM SUCESSO ====="
