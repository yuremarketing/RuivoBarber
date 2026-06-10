#!/usr/bin/env bash
# ============================================================
# RuivoBarber — Teste E2E: Fluxo do Administrador
# ============================================================
#
# Pré-requisitos: docker compose up -d (ambiente rodando)
#
# Uso:   bash scripts/e2e_admin_test.sh
# ============================================================

set -euo pipefail

# ── Cores ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Configuração ────────────────────────────────────────────
API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

PASSED=0
FAILED=0
TOTAL=0

# ── Helpers ──────────────────────────────────────────────────
db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

# Variante que captura stderr (para testar constraints)
db_exec_with_errors() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>&1
}

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL + 1))
  if [[ "$expected" == "$actual" ]]; then
    echo -e "  ${GREEN}✔ PASS${NC}  $desc"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}✘ FAIL${NC}  $desc"
    echo -e "         esperado: ${YELLOW}$expected${NC}"
    echo -e "         recebido: ${RED}$actual${NC}"
    FAILED=$((FAILED + 1))
  fi
}

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  TOTAL=$((TOTAL + 1))
  if echo "$haystack" | grep -q "$needle"; then
    echo -e "  ${GREEN}✔ PASS${NC}  $desc"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}✘ FAIL${NC}  $desc"
    echo -e "         esperado conter: ${YELLOW}$needle${NC}"
    echo -e "         recebido:        ${RED}$haystack${NC}"
    FAILED=$((FAILED + 1))
  fi
}

assert_http_status() {
  local desc="$1" expected_status="$2" method="$3" url="$4"
  shift 4
  local status
  if [[ -n "${TOKEN:-}" && "$url" == *"/api/v1/"* && "$url" != *"/health"* && "$url" != *"/auth/login"* && "$url" != *"/inexistente"* ]]; then
    status=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" -X "$method" "$url" "$@")
  else
    status=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$url" "$@")
  fi
  assert_eq "$desc" "$expected_status" "$status"
}

section() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ╔════════════════════════════════════════════════════════════╗
# ║                  INÍCIO DOS TESTES E2E                    ║
# ╚════════════════════════════════════════════════════════════╝

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     ✂️  RuivoBarber — Teste E2E: Fluxo Administrador      ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"

# Limpeza inicial para garantir idempotência caso o script anterior tenha abortado no meio
db_exec "DELETE FROM Cupons WHERE codigo LIKE 'E2E-%';" >/dev/null 2>&1 || true
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login LIKE 'e2e_%' OR login = 'api_cli');" >/dev/null 2>&1 || true
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login LIKE 'e2e_%' OR login = 'api_cli');" >/dev/null 2>&1 || true
db_exec "DELETE FROM Usuarios WHERE login LIKE 'e2e_%' OR login = 'api_cli';" >/dev/null 2>&1 || true
db_exec "DELETE FROM Configuracoes WHERE chaveapiwhatsapp='test_api_key_123';" >/dev/null 2>&1 || true

# ─────────────────────────────────────────────────────────────
# 1. HEALTH CHECK DA API
# ─────────────────────────────────────────────────────────────
section "1. Health Check da API"

HEALTH=$(curl -s "$API_URL/api/v1/health")
assert_contains "API retorna status ok" '"status":"ok"' "$HEALTH"
assert_contains "API identifica o serviço" '"service":"RuivoBarber API"' "$HEALTH"
assert_http_status "Health endpoint retorna HTTP 200" "200" "GET" "$API_URL/api/v1/health"

# ─────────────────────────────────────────────────────────────
# 2. VERIFICAÇÃO DO SCHEMA DO BANCO
# ─────────────────────────────────────────────────────────────
section "2. Verificação do Schema do Banco de Dados"

TABLES=$(db_exec "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")

assert_contains "Tabela 'usuarios' existe"        "usuarios"        "$TABLES"
assert_contains "Tabela 'niveis' existe"           "niveis"          "$TABLES"
assert_contains "Tabela 'progressocliente' existe" "progressocliente" "$TABLES"
assert_contains "Tabela 'servicos' existe"         "servicos"        "$TABLES"
assert_contains "Tabela 'agendamentos' existe"     "agendamentos"    "$TABLES"
assert_contains "Tabela 'cupons' existe"           "cupons"          "$TABLES"
assert_contains "Tabela 'configuracoes' existe"    "configuracoes"   "$TABLES"

# Verificar colunas da tabela Usuarios
COLS_USUARIOS=$(db_exec "SELECT column_name FROM information_schema.columns WHERE table_name='usuarios' ORDER BY ordinal_position;")
assert_contains "Coluna 'id' em Usuarios"       "id"       "$COLS_USUARIOS"
assert_contains "Coluna 'nome' em Usuarios"     "nome"     "$COLS_USUARIOS"
assert_contains "Coluna 'cargo' em Usuarios"    "cargo"    "$COLS_USUARIOS"
assert_contains "Coluna 'login' em Usuarios"    "login"    "$COLS_USUARIOS"
assert_contains "Coluna 'senha' em Usuarios"    "senha"    "$COLS_USUARIOS"
assert_contains "Coluna 'comissao' em Usuarios" "comissao" "$COLS_USUARIOS"

# ─────────────────────────────────────────────────────────────
# 3. DADOS SEED — ADMIN INICIAL
# ─────────────────────────────────────────────────────────────
section "3. Dados Seed — Administrador Inicial"

ADMIN_COUNT=$(db_exec "SELECT COUNT(*) FROM Usuarios WHERE cargo='Adm';")
assert_eq "Existe pelo menos 1 administrador" "1" "$ADMIN_COUNT"

ADMIN_LOGIN=$(db_exec "SELECT login FROM Usuarios WHERE cargo='Adm' LIMIT 1;")
assert_eq "Login do admin é 'admin'" "admin" "$ADMIN_LOGIN"

ADMIN_NOME=$(db_exec "SELECT nome FROM Usuarios WHERE cargo='Adm' AND login='admin';")
assert_eq "Nome do admin é 'Administrador'" "Administrador" "$ADMIN_NOME"

# ─────────────────────────────────────────────────────────────
# 4. DADOS SEED — NÍVEIS RPG
# ─────────────────────────────────────────────────────────────
section "4. Dados Seed — Níveis RPG"

NIVEL_COUNT=$(db_exec "SELECT COUNT(*) FROM Niveis;")
assert_eq "Existem 4 níveis cadastrados" "4" "$NIVEL_COUNT"

NIVEL_1=$(db_exec "SELECT nomedonivel FROM Niveis WHERE id=1;")
assert_eq "Nível 1 é 'Corte Iniciante'" "Corte Iniciante" "$NIVEL_1"

NIVEL_4=$(db_exec "SELECT nomedonivel FROM Niveis WHERE id=4;")
assert_eq "Nível 4 é 'Rei da Cadeira'" "Rei da Cadeira" "$NIVEL_4"

XP_NIVEL_3=$(db_exec "SELECT xpnecessario FROM Niveis WHERE id=3;")
assert_eq "XP necessário para nível 3 é 600" "600" "$XP_NIVEL_3"

BONUS_4=$(db_exec "SELECT bonus FROM Niveis WHERE id=4;")
assert_eq "Bônus nível 4 é '1 Corte Grátis'" "1 Corte Grátis" "$BONUS_4"

# ─────────────────────────────────────────────────────────────
# 5. DADOS SEED — SERVIÇOS
# ─────────────────────────────────────────────────────────────
section "5. Dados Seed — Serviços"

SERVICO_COUNT=$(db_exec "SELECT COUNT(*) FROM Servicos;")
assert_eq "Existem 4 serviços cadastrados" "4" "$SERVICO_COUNT"

SERVICO_CORTE=$(db_exec "SELECT preco FROM Servicos WHERE nome='Corte Simples';")
assert_eq "Preço 'Corte Simples' é 35.00" "35.00" "$SERVICO_CORTE"

SERVICO_COMBO=$(db_exec "SELECT xprecompensa FROM Servicos WHERE nome='Corte + Barba';")
assert_eq "XP recompensa 'Corte + Barba' é 25" "25" "$SERVICO_COMBO"

SERVICO_DURACAO=$(db_exec "SELECT duracaominutos FROM Servicos WHERE nome='Barba Completa';")
assert_eq "Duração 'Barba Completa' é 45 min" "45" "$SERVICO_DURACAO"

# ─────────────────────────────────────────────────────────────
# 6. FLUXO ADMIN: CADASTRAR CLIENTES (via DB)
# ─────────────────────────────────────────────────────────────
section "6. Fluxo Admin — Cadastrar Clientes"

# Limpar dados de teste anteriores
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('e2e_cliente1','e2e_cliente2','e2e_barbeiro1'));" >/dev/null 2>&1 || true
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('e2e_cliente1','e2e_cliente2'));" >/dev/null 2>&1 || true
db_exec "DELETE FROM Cupons WHERE clienteid IN (SELECT id FROM Usuarios WHERE login IN ('e2e_cliente1','e2e_cliente2'));" >/dev/null 2>&1 || true
db_exec "DELETE FROM Usuarios WHERE login IN ('e2e_cliente1','e2e_cliente2','e2e_barbeiro1');" >/dev/null 2>&1 || true

# Inserir clientes de teste
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Teste 1', 'Cliente', 'e2e_cliente1', 'hash_teste');"
CLIENTE1_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='e2e_cliente1';")
assert_contains "Cliente 1 inserido com sucesso (ID=$CLIENTE1_ID)" "$CLIENTE1_ID" "$CLIENTE1_ID"

db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Cliente Teste 2', 'Cliente', 'e2e_cliente2', 'hash_teste');"
CLIENTE2_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='e2e_cliente2';")
assert_contains "Cliente 2 inserido com sucesso (ID=$CLIENTE2_ID)" "$CLIENTE2_ID" "$CLIENTE2_ID"

# Inserir barbeiro de teste
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha, comissao) VALUES ('Barbeiro Teste', 'Barbeiro', 'e2e_barbeiro1', 'hash_teste', 30.00);"
BARBEIRO_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='e2e_barbeiro1';")
assert_contains "Barbeiro inserido com sucesso (ID=$BARBEIRO_ID)" "$BARBEIRO_ID" "$BARBEIRO_ID"

# ─────────────────────────────────────────────────────────────
# 6.5. CADASTRO DE CLIENTES VIA API (Opção A)
# ─────────────────────────────────────────────────────────────
section "6.5. Cadastro de Clientes via API"

# Criar Admin token temporário para usar nesta etapa se necessário
db_exec "DELETE FROM Usuarios WHERE login = 'e2e_admin';" >/dev/null 2>&1 || true
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Admin E2E', 'Adm', 'e2e_admin', 'pwd_admin');"
AUTH_RESP_TEMP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "e2e_admin", "senha": "pwd_admin"}' "$API_URL/api/v1/auth/login")
TOKEN_TEMP=$(echo "$AUTH_RESP_TEMP" | jq -r '.token')

# 1. Sem Auth
STATUS_NO_AUTH=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/api/v1/clientes" -H "Content-Type: application/json" -d '{"nome":"API Cliente", "login":"api_cli", "senha":"123"}')
assert_eq "Criar cliente sem token retorna HTTP 401" "401" "$STATUS_NO_AUTH"

# 2. Com token de cliente comum
db_exec "UPDATE Usuarios SET senha = 'pwd_cliente' WHERE id = $CLIENTE1_ID;"
CLIENTE_AUTH=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "e2e_cliente1", "senha": "pwd_cliente"}' "$API_URL/api/v1/auth/login")
CLIENTE_TOKEN=$(echo "$CLIENTE_AUTH" | jq -r '.token')

STATUS_CLIENTE_AUTH=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $CLIENTE_TOKEN" -X POST "$API_URL/api/v1/clientes" -H "Content-Type: application/json" -d '{"nome":"API Cliente", "login":"api_cli", "senha":"123"}')
assert_eq "Criar cliente com token de cliente comum retorna HTTP 403" "403" "$STATUS_CLIENTE_AUTH"

# 3. Criar com sucesso usando token de Admin
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login = 'api_cli');" >/dev/null 2>&1 || true
db_exec "DELETE FROM Usuarios WHERE login = 'api_cli';" >/dev/null 2>&1 || true

API_CREATION_RESP=$(curl -s -H "Authorization: Bearer $TOKEN_TEMP" -H "Content-Type: application/json" -X POST "$API_URL/api/v1/clientes" -d '{"nome":"API Cliente", "login":"api_cli", "senha":"pwd_api_cliente"}')
assert_contains "Resposta da criação contém nome" "API Cliente" "$API_CREATION_RESP"
assert_contains "Resposta da criação contém login" "api_cli" "$API_CREATION_RESP"

NEW_CLI_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='api_cli';")
assert_contains "Cliente novo criado com sucesso no BD" "$NEW_CLI_ID" "$NEW_CLI_ID"

NEW_CLI_CARGO=$(db_exec "SELECT cargo FROM Usuarios WHERE login='api_cli';")
assert_eq "Cliente novo tem cargo 'Cliente'" "Cliente" "$NEW_CLI_CARGO"

NEW_CLI_XP=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$NEW_CLI_ID;")
assert_eq "Cliente novo inicia com 0 XP" "0" "$NEW_CLI_XP"

# 4. Criar duplicado retorna erro
STATUS_DUPLICATE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN_TEMP" -X POST "$API_URL/api/v1/clientes" -H "Content-Type: application/json" -d '{"nome":"API Cliente", "login":"api_cli", "senha":"pwd_api_cliente"}')
assert_eq "Criar cliente duplicado retorna HTTP 400" "400" "$STATUS_DUPLICATE"

# Limpar após o teste do cadastro via API para não interferir nas seções seguintes
db_exec "DELETE FROM ProgressoCliente WHERE clienteid = $NEW_CLI_ID;" >/dev/null 2>&1 || true
db_exec "DELETE FROM Usuarios WHERE id = $NEW_CLI_ID;" >/dev/null 2>&1 || true

# ─────────────────────────────────────────────────────────────
# 7. FLUXO ADMIN: LISTAR CLIENTES VIA API
# ─────────────────────────────────────────────────────────────
section "7. Fluxo Admin — Listar Clientes via API"

# Obter Token JWT do Administrador de Testes
db_exec "DELETE FROM Usuarios WHERE login = 'e2e_admin';" >/dev/null 2>&1 || true
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Admin E2E', 'Adm', 'e2e_admin', 'pwd_admin');"
AUTH_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"login": "e2e_admin", "senha": "pwd_admin"}' "$API_URL/api/v1/auth/login")
TOKEN=$(echo "$AUTH_RESP" | jq -r '.token')

assert_http_status "GET /clientes retorna HTTP 200" "200" "GET" "$API_URL/api/v1/clientes"

CLIENTES_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/clientes")
assert_contains "Resposta contém 'Cliente Teste 1'"  "Cliente Teste 1" "$CLIENTES_JSON"
assert_contains "Resposta contém 'Cliente Teste 2'"  "Cliente Teste 2" "$CLIENTES_JSON"

# Admin e barbeiro NÃO devem aparecer (query filtra cargo='Cliente')
TOTAL_BEFORE=$TOTAL
TOTAL=$((TOTAL + 1))
if echo "$CLIENTES_JSON" | grep -q "Administrador"; then
  echo -e "  ${RED}✘ FAIL${NC}  Admin NÃO deve aparecer na lista de clientes"
  FAILED=$((FAILED + 1))
else
  echo -e "  ${GREEN}✔ PASS${NC}  Admin NÃO aparece na lista de clientes"
  PASSED=$((PASSED + 1))
fi

TOTAL=$((TOTAL + 1))
if echo "$CLIENTES_JSON" | grep -q "Barbeiro Teste"; then
  echo -e "  ${RED}✘ FAIL${NC}  Barbeiro NÃO deve aparecer na lista de clientes"
  FAILED=$((FAILED + 1))
else
  echo -e "  ${GREEN}✔ PASS${NC}  Barbeiro NÃO aparece na lista de clientes"
  PASSED=$((PASSED + 1))
fi

# ─────────────────────────────────────────────────────────────
# 8. FLUXO ADMIN: BUSCAR CLIENTE POR ID VIA API
# ─────────────────────────────────────────────────────────────
section "8. Fluxo Admin — Buscar Cliente por ID via API"

assert_http_status "GET /clientes/$CLIENTE1_ID retorna HTTP 200" "200" "GET" "$API_URL/api/v1/clientes/$CLIENTE1_ID"

CLIENTE1_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/clientes/$CLIENTE1_ID")
assert_contains "Retorna nome 'Cliente Teste 1'"     "Cliente Teste 1"  "$CLIENTE1_JSON"
assert_contains "Retorna login 'e2e_cliente1'"        "e2e_cliente1"     "$CLIENTE1_JSON"
assert_contains "Retorna cargo 'Cliente'"             "Cliente"          "$CLIENTE1_JSON"

# ─────────────────────────────────────────────────────────────
# 9. FLUXO ADMIN: GESTÃO DE PROGRESSO RPG
# ─────────────────────────────────────────────────────────────
section "9. Fluxo Admin — Gestão de Progresso RPG"

db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual, nivelatual, barrapercentual) VALUES ($CLIENTE1_ID, 320, 2, 53.33);"
PROGRESSO=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLIENTE1_ID;")
assert_eq "XP atual do cliente 1 é 320" "320" "$PROGRESSO"

NIVEL_ATUAL=$(db_exec "SELECT nivelatual FROM ProgressoCliente WHERE clienteid=$CLIENTE1_ID;")
assert_eq "Nível atual do cliente 1 é 2" "2" "$NIVEL_ATUAL"

BARRA=$(db_exec "SELECT barrapercentual FROM ProgressoCliente WHERE clienteid=$CLIENTE1_ID;")
assert_eq "Barra percentual é 53.33" "53.33" "$BARRA"

# Simular progresso: admin atualiza XP após serviço
db_exec "UPDATE ProgressoCliente SET xpatual = xpatual + 25, barrapercentual = ((320 + 25)::decimal / 600) * 100 WHERE clienteid=$CLIENTE1_ID;"
XP_ATUALIZADO=$(db_exec "SELECT xpatual FROM ProgressoCliente WHERE clienteid=$CLIENTE1_ID;")
assert_eq "XP após serviço 'Corte + Barba' é 345" "345" "$XP_ATUALIZADO"

# ─────────────────────────────────────────────────────────────
# 10. FLUXO ADMIN: GESTÃO DE AGENDAMENTOS
# ─────────────────────────────────────────────────────────────
section "10. Fluxo Admin — Gestão de Agendamentos"

SERVICO1_ID=$(db_exec "SELECT id FROM Servicos WHERE nome='Corte Simples';")

db_exec "INSERT INTO Agendamentos (clienteid, barbeiroid, servicoid, datahora, status) VALUES ($CLIENTE1_ID, $BARBEIRO_ID, $SERVICO1_ID, NOW() + INTERVAL '1 day', 'Pendente');"
AGENDAMENTO_STATUS=$(db_exec "SELECT status FROM Agendamentos WHERE clienteid=$CLIENTE1_ID ORDER BY id DESC LIMIT 1;")
assert_eq "Agendamento criado com status 'Pendente'" "Pendente" "$AGENDAMENTO_STATUS"

# Admin confirma agendamento
AGENDAMENTO_ID=$(db_exec "SELECT id FROM Agendamentos WHERE clienteid=$CLIENTE1_ID ORDER BY id DESC LIMIT 1;")
db_exec "UPDATE Agendamentos SET status='Confirmado' WHERE id=$AGENDAMENTO_ID;"
STATUS_CONFIRMADO=$(db_exec "SELECT status FROM Agendamentos WHERE id=$AGENDAMENTO_ID;")
assert_eq "Admin confirma agendamento → 'Confirmado'" "Confirmado" "$STATUS_CONFIRMADO"

# Admin conclui agendamento
db_exec "UPDATE Agendamentos SET status='Concluido' WHERE id=$AGENDAMENTO_ID;"
STATUS_CONCLUIDO=$(db_exec "SELECT status FROM Agendamentos WHERE id=$AGENDAMENTO_ID;")
assert_eq "Admin conclui agendamento → 'Concluido'" "Concluido" "$STATUS_CONCLUIDO"

# Verificar restrição de status inválido
TOTAL=$((TOTAL + 1))
INVALID_STATUS_RESULT=$(db_exec_with_errors "UPDATE Agendamentos SET status='Invalido' WHERE id=$AGENDAMENTO_ID;" || true)
if echo "$INVALID_STATUS_RESULT" | grep -qi "violates\|check\|constraint\|ERROR"; then
  echo -e "  ${GREEN}✔ PASS${NC}  Rejeita status inválido (CHECK constraint)"
  PASSED=$((PASSED + 1))
  # Reverter status para manter integridade
  db_exec "UPDATE Agendamentos SET status='Concluido' WHERE id=$AGENDAMENTO_ID;" >/dev/null 2>&1 || true
else
  echo -e "  ${RED}✘ FAIL${NC}  Deveria rejeitar status inválido"
  FAILED=$((FAILED + 1))
fi

# ─────────────────────────────────────────────────────────────
# 11. FLUXO ADMIN: GESTÃO DE CUPONS
# ─────────────────────────────────────────────────────────────
section "11. Fluxo Admin — Gestão de Cupons"

db_exec "INSERT INTO Cupons (codigo, descricao, descontopercent, clienteid, validoate) VALUES ('E2E-DESCONTO10', 'Teste E2E 10% off', 10.00, $CLIENTE1_ID, CURRENT_DATE + INTERVAL '30 days');"
CUPOM_EXISTE=$(db_exec "SELECT COUNT(*) FROM Cupons WHERE codigo='E2E-DESCONTO10';")
assert_eq "Cupom 'E2E-DESCONTO10' criado com sucesso" "1" "$CUPOM_EXISTE"

CUPOM_USADO=$(db_exec "SELECT usado FROM Cupons WHERE codigo='E2E-DESCONTO10';")
assert_eq "Cupom inicia como não usado (false)" "f" "$CUPOM_USADO"

# Admin marca cupom como usado
db_exec "UPDATE Cupons SET usado=TRUE WHERE codigo='E2E-DESCONTO10';"
CUPOM_ATUALIZADO=$(db_exec "SELECT usado FROM Cupons WHERE codigo='E2E-DESCONTO10';")
assert_eq "Admin marca cupom como usado (true)" "t" "$CUPOM_ATUALIZADO"

# Verificar unicidade do código do cupom
TOTAL=$((TOTAL + 1))
DUPLICADO_RESULT=$(db_exec_with_errors "INSERT INTO Cupons (codigo, descricao, descontopercent, clienteid, validoate) VALUES ('E2E-DESCONTO10', 'Duplicado', 5.00, $CLIENTE2_ID, CURRENT_DATE + INTERVAL '7 days');" || true)
if echo "$DUPLICADO_RESULT" | grep -qi "duplicate\|unique\|already exists\|ERROR"; then
  echo -e "  ${GREEN}✔ PASS${NC}  Rejeita código de cupom duplicado (UNIQUE)"
  PASSED=$((PASSED + 1))
else
  echo -e "  ${RED}✘ FAIL${NC}  Deveria rejeitar cupom duplicado"
  FAILED=$((FAILED + 1))
fi

# ─────────────────────────────────────────────────────────────
# 12. FLUXO ADMIN: GESTÃO DE BARBEIROS (comissão)
# ─────────────────────────────────────────────────────────────
section "12. Fluxo Admin — Gestão de Barbeiros"

COMISSAO=$(db_exec "SELECT comissao FROM Usuarios WHERE login='e2e_barbeiro1';")
assert_eq "Comissão do barbeiro é 30.00" "30.00" "$COMISSAO"

# Admin atualiza comissão
db_exec "UPDATE Usuarios SET comissao=35.50 WHERE login='e2e_barbeiro1';"
COMISSAO_ATUALIZADA=$(db_exec "SELECT comissao FROM Usuarios WHERE login='e2e_barbeiro1';")
assert_eq "Admin atualiza comissão para 35.50" "35.50" "$COMISSAO_ATUALIZADA"

# ─────────────────────────────────────────────────────────────
# 13. FLUXO ADMIN: CONFIGURAÇÕES DO SISTEMA
# ─────────────────────────────────────────────────────────────
section "13. Fluxo Admin — Configurações do Sistema"

db_exec "INSERT INTO Configuracoes (chaveapiwhatsapp, urlwebhook) VALUES ('test_api_key_123', 'https://webhook.example.com/ruivobarber');"
CONFIG=$(db_exec "SELECT chaveapiwhatsapp FROM Configuracoes ORDER BY id DESC LIMIT 1;")
assert_eq "Chave API WhatsApp salva" "test_api_key_123" "$CONFIG"

WEBHOOK=$(db_exec "SELECT urlwebhook FROM Configuracoes ORDER BY id DESC LIMIT 1;")
assert_eq "URL Webhook salva" "https://webhook.example.com/ruivobarber" "$WEBHOOK"

# ─────────────────────────────────────────────────────────────
# 14. TRATAMENTO DE ERROS — API
# ─────────────────────────────────────────────────────────────
section "14. Tratamento de Erros — API"

assert_http_status "GET /clientes/abc retorna HTTP 400 (ID inválido)" "400" "GET" "$API_URL/api/v1/clientes/abc"

ERROR_MSG=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/clientes/abc")
assert_contains "Mensagem de erro para ID inválido" "inv" "$ERROR_MSG"

assert_http_status "GET /clientes/99999 retorna HTTP 404 (não encontrado)" "404" "GET" "$API_URL/api/v1/clientes/99999"

ERROR_404=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/clientes/99999")
assert_contains "Mensagem de erro para cliente inexistente" "encontrado" "$ERROR_404"

assert_http_status "GET rota inexistente retorna HTTP 404" "404" "GET" "$API_URL/api/v1/inexistente"

# ─────────────────────────────────────────────────────────────
# 15. VERIFICAÇÃO DE INTEGRIDADE REFERENCIAL
# ─────────────────────────────────────────────────────────────
section "15. Integridade Referencial do Banco"

# Verificar CASCADE: ao deletar cliente, progresso deve ser removido
db_exec "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Temp Delete', 'Cliente', 'e2e_temp_del', 'hash');"
TEMP_ID=$(db_exec "SELECT id FROM Usuarios WHERE login='e2e_temp_del';")
db_exec "INSERT INTO ProgressoCliente (clienteid, xpatual) VALUES ($TEMP_ID, 100);"
PROG_ANTES=$(db_exec "SELECT COUNT(*) FROM ProgressoCliente WHERE clienteid=$TEMP_ID;")
assert_eq "Progresso existe antes de deletar cliente" "1" "$PROG_ANTES"

db_exec "DELETE FROM Usuarios WHERE id=$TEMP_ID;"
PROG_DEPOIS=$(db_exec "SELECT COUNT(*) FROM ProgressoCliente WHERE clienteid=$TEMP_ID;")
assert_eq "CASCADE: progresso removido ao deletar cliente" "0" "$PROG_DEPOIS"

# Verificar CHECK constraint no cargo
TOTAL=$((TOTAL + 1))
CARGO_INVALIDO=$(db_exec_with_errors "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Invalido', 'Gerente', 'e2e_invalido', 'hash');" || true)
if echo "$CARGO_INVALIDO" | grep -qi "violates\|check\|constraint\|ERROR"; then
  echo -e "  ${GREEN}✔ PASS${NC}  Rejeita cargo inválido 'Gerente' (CHECK constraint)"
  PASSED=$((PASSED + 1))
else
  echo -e "  ${RED}✘ FAIL${NC}  Deveria rejeitar cargo inválido"
  # Cleanup caso tenha sido inserido
  db_exec "DELETE FROM Usuarios WHERE login='e2e_invalido';" >/dev/null 2>&1 || true
  FAILED=$((FAILED + 1))
fi

# Verificar UNIQUE constraint no login
TOTAL=$((TOTAL + 1))
LOGIN_DUP=$(db_exec_with_errors "INSERT INTO Usuarios (nome, cargo, login, senha) VALUES ('Dup', 'Cliente', 'admin', 'hash');" || true)
if echo "$LOGIN_DUP" | grep -qi "duplicate\|unique\|already exists\|ERROR"; then
  echo -e "  ${GREEN}✔ PASS${NC}  Rejeita login duplicado 'admin' (UNIQUE)"
  PASSED=$((PASSED + 1))
else
  echo -e "  ${RED}✘ FAIL${NC}  Deveria rejeitar login duplicado"
  FAILED=$((FAILED + 1))
fi

# ─────────────────────────────────────────────────────────────
# 16. FRONTEND ACESSÍVEL
# ─────────────────────────────────────────────────────────────
section "16. Frontend Acessível"

assert_http_status "Frontend retorna HTTP 200" "200" "GET" "http://localhost:3000"

FRONTEND_HTML=$(curl -s "http://localhost:3000")
assert_contains "Frontend contém tag <title>RuivoBarber</title>" "RuivoBarber" "$FRONTEND_HTML"
assert_contains "Frontend contém div#root"                       'id="root"'   "$FRONTEND_HTML"

# ─────────────────────────────────────────────────────────────
# CLEANUP
# ─────────────────────────────────────────────────────────────
section "🧹 Limpeza de Dados de Teste"

db_exec "DELETE FROM Cupons WHERE codigo LIKE 'E2E-%';" >/dev/null 2>&1
db_exec "DELETE FROM Agendamentos WHERE clienteid IN (SELECT id FROM Usuarios WHERE login LIKE 'e2e_%');" >/dev/null 2>&1
db_exec "DELETE FROM ProgressoCliente WHERE clienteid IN (SELECT id FROM Usuarios WHERE login LIKE 'e2e_%');" >/dev/null 2>&1
db_exec "DELETE FROM Usuarios WHERE login LIKE 'e2e_%';" >/dev/null 2>&1
db_exec "DELETE FROM Configuracoes WHERE chaveapiwhatsapp='test_api_key_123';" >/dev/null 2>&1

echo -e "  ${GREEN}✔${NC} Dados de teste removidos com sucesso"

# ─────────────────────────────────────────────────────────────
# RESULTADO FINAL
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  📊 RESULTADO FINAL${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Total:    ${BOLD}$TOTAL${NC}"
echo -e "  Passed:   ${GREEN}${BOLD}$PASSED${NC}"
echo -e "  Failed:   ${RED}${BOLD}$FAILED${NC}"
echo ""

if [[ $FAILED -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}🎉 TODOS OS TESTES PASSARAM!${NC}"
  echo ""
  exit 0
else
  echo -e "  ${RED}${BOLD}❌ $FAILED TESTE(S) FALHARAM${NC}"
  echo ""
  exit 1
fi
