#!/usr/bin/env bash
set -exuo pipefail

API_URL="http://localhost:8080"
DB_CONTAINER="ruivobarber-db"
DB_USER="admin"
DB_NAME="ruivobarber"

db_exec() {
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null
}

echo "===== INICIANDO TESTE END-TO-END DO PDV E CHECKOUT (TASK-065) ====="

# 1. Obter ou registrar Cliente de Teste no Banco
echo "[+] Garantindo existência do cliente de teste..."
CLIENTE_ID=$(db_exec "SELECT ID FROM Usuarios WHERE Login='test_checkout_cli';")
if [ -z "$CLIENTE_ID" ]; then
  # Se não existe, vamos criar inserindo direto no banco ou registrando via endpoint (registramos via banco por simplicidade e controle de ID)
  db_exec "INSERT INTO Usuarios (Nome, Cargo, Login, Senha) VALUES ('Cliente Checkout Teste', 'Cliente', 'test_checkout_cli', 'pwd');"
  CLIENTE_ID=$(db_exec "SELECT ID FROM Usuarios WHERE Login='test_checkout_cli';")
fi
# Garantir registro na tabela de ProgressoCliente
PROG_EXIST=$(db_exec "SELECT COUNT(*) FROM ProgressoCliente WHERE ClienteID=$CLIENTE_ID;")
if [ "$PROG_EXIST" -eq 0 ]; then
  db_exec "INSERT INTO ProgressoCliente (ClienteID, XPAtual, nivelatual) VALUES ($CLIENTE_ID, 0, 1);"
fi

# Resetar XP do cliente para 0 para validação precisa
db_exec "UPDATE ProgressoCliente SET XPAtual=0 WHERE ClienteID=$CLIENTE_ID;"
echo "✔ Cliente ID: $CLIENTE_ID preparado com 0 XP."

# 2. Obter ou registrar Barbeiro de Teste no Banco
echo "[+] Garantindo existência do barbeiro de teste..."
BARBEIRO_ID=$(db_exec "SELECT ID FROM Usuarios WHERE Login='test_checkout_barb';")
if [ -z "$BARBEIRO_ID" ]; then
  db_exec "INSERT INTO Usuarios (Nome, Cargo, Login, Senha) VALUES ('Barbeiro Checkout Teste', 'Barbeiro', 'test_checkout_barb', 'pwd');"
  BARBEIRO_ID=$(db_exec "SELECT ID FROM Usuarios WHERE Login='test_checkout_barb';")
fi
# Garantir disponibilidade do barbeiro para todos os dias
db_exec "INSERT INTO BarbeiroDisponibilidade (BarbeiroID, DiaSemana, HoraInicio, HoraFim) VALUES 
  ($BARBEIRO_ID, 0, '00:00:00', '23:59:59'),
  ($BARBEIRO_ID, 1, '00:00:00', '23:59:59'),
  ($BARBEIRO_ID, 2, '00:00:00', '23:59:59'),
  ($BARBEIRO_ID, 3, '00:00:00', '23:59:59'),
  ($BARBEIRO_ID, 4, '00:00:00', '23:59:59'),
  ($BARBEIRO_ID, 5, '00:00:00', '23:59:59'),
  ($BARBEIRO_ID, 6, '00:00:00', '23:59:59') ON CONFLICT DO NOTHING;"
echo "✔ Barbeiro ID: $BARBEIRO_ID preparado."

# 3. Obter ou cadastrar Serviço de Teste no Banco
echo "[+] Garantindo existência do serviço de teste..."
SERVICO_ID=$(db_exec "SELECT ID FROM Servicos WHERE Nome='Corte Checkout Teste';")
if [ -z "$SERVICO_ID" ]; then
  db_exec "INSERT INTO Servicos (Nome, Preco, DuracaoMinutos, XpRecompensa) VALUES ('Corte Checkout Teste', 50.00, 30, 25);"
  SERVICO_ID=$(db_exec "SELECT ID FROM Servicos WHERE Nome='Corte Checkout Teste';")
fi
echo "✔ Serviço ID: $SERVICO_ID (Preço: R$ 50.00, XP: 25) preparado."

# 4. Fazer Login como Barbeiro para obter o Token JWT
echo "[+] Fazendo login como o Barbeiro fictício para obter token JWT..."
LOGIN_RESP=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"login": "barbeiro_ruivo", "senha": "RuivoBarbeiro123!"}' \
  "$API_URL/api/v1/auth/login")

TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "✘ TESTE FALHOU: Login não retornou token JWT."
  echo "Resposta: $LOGIN_RESP"
  exit 1
fi
echo "✔ Login efetuado com sucesso."

# 5. Fechar qualquer caixa que possa estar aberto antes de iniciar para garantir estado limpo
db_exec "UPDATE caixas SET status='Fechado', fechadoem=NOW() WHERE status='Aberto';"

# 6. Testar bloqueio: tentar efetuar venda com o caixa fechado
echo "[+] Testando se a venda é rejeitada quando o caixa está fechado..."
VENDA_FECHADO_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"cliente_id\": $CLIENTE_ID, \"barbeiro_id\": $BARBEIRO_ID, \"desconto\": 0, \"metodo_pagamento\": \"Dinheiro\", \"itens\": [{\"servico_id\": $SERVICO_ID, \"preco_unitario\": 50.00, \"quantidade\": 1}]}" \
  "$API_URL/api/v1/pdv/venda")

echo "Resposta de venda com caixa fechado: $VENDA_FECHADO_RESP"
ERR_FECHADO=$(echo "$VENDA_FECHADO_RESP" | jq -r '.error')
if [[ "$ERR_FECHADO" != *"caixa"* ]]; then
  echo "✘ TESTE FALHOU: A venda deveria ter sido bloqueada por falta de caixa aberto."
  exit 1
fi
echo "✔ Bloqueio de caixa fechado validado com sucesso!"

# 7. Abrir o Caixa com saldo inicial de R$ 100,00
echo "[+] Abrindo o caixa com saldo inicial de R$ 100.00..."
ABRIR_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"saldo_inicial": 100.00}' \
  "$API_URL/api/v1/pdv/caixa/abrir")

echo "Resposta Abertura Caixa: $ABRIR_RESP"
CAIXA_ID=$(echo "$ABRIR_RESP" | jq -r '.id')
if [ -z "$CAIXA_ID" ] || [ "$CAIXA_ID" == "null" ]; then
  echo "✘ TESTE FALHOU: Falha ao abrir o caixa."
  exit 1
fi
echo "✔ Caixa ID $CAIXA_ID aberto com sucesso."

# 8. Registrar Venda 1: Venda identificada para o cliente de teste, com pagamento em dinheiro, sem desconto.
# Preço: R$ 50.00.
echo "[+] Registrando Venda 1: Cliente Identificado, R$ 50.00 em Dinheiro (Acumular XP)..."
VENDA1_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"cliente_id\": $CLIENTE_ID, \"barbeiro_id\": $BARBEIRO_ID, \"desconto\": 0, \"metodo_pagamento\": \"Dinheiro\", \"itens\": [{\"servico_id\": $SERVICO_ID, \"preco_unitario\": 50.00, \"quantidade\": 1}]}" \
  "$API_URL/api/v1/pdv/venda")

echo "Resposta Venda 1: $VENDA1_RESP"
V1_ID=$(echo "$VENDA1_RESP" | jq -r '.id')
if [ -z "$V1_ID" ] || [ "$V1_ID" == "null" ]; then
  echo "✘ TESTE FALHOU: Falha ao processar Venda 1."
  exit 1
fi
echo "✔ Venda 1 registrada com sucesso (ID: $V1_ID)."

# Validar se o XP do cliente aumentou em 25 pontos ou mais (devido a badges como Primeiro Sangue)
XP_CLIENTE=$(db_exec "SELECT XPAtual FROM progressocliente WHERE clienteid=$CLIENTE_ID;")
echo "[+] XP atual do cliente após a venda: $XP_CLIENTE"
if [ "$XP_CLIENTE" -lt 25 ]; then
  echo "✘ TESTE FALHOU: O XP do cliente deveria ser pelo menos 25, mas é $XP_CLIENTE."
  exit 1
fi
echo "✔ Integração de Fidelidade / XP validada com sucesso!"

# 9. Registrar Venda 2: Venda anônima (cliente_id = null), com desconto de R$ 10.00, pagamento em dinheiro.
# Valor líquido: R$ 50.00 - R$ 10.00 = R$ 40.00.
echo "[+] Registrando Venda 2: Cliente Anônimo, R$ 50.00 (com R$ 10.00 de desconto) em Dinheiro..."
VENDA2_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"cliente_id\": null, \"barbeiro_id\": $BARBEIRO_ID, \"desconto\": 10.00, \"metodo_pagamento\": \"Dinheiro\", \"itens\": [{\"servico_id\": $SERVICO_ID, \"preco_unitario\": 50.00, \"quantidade\": 1}]}" \
  "$API_URL/api/v1/pdv/venda")

echo "Resposta Venda 2: $VENDA2_RESP"
V2_ID=$(echo "$VENDA2_RESP" | jq -r '.id')
if [ -z "$V2_ID" ] || [ "$V2_ID" == "null" ]; then
  echo "✘ TESTE FALHOU: Falha ao processar Venda 2."
  exit 1
fi
echo "✔ Venda 2 registrada com sucesso (ID: $V2_ID)."

# 10. Registrar Venda 3: Pix de R$ 50.00. Não deve somar no saldo esperado físico do caixa.
echo "[+] Registrando Venda 3: Cliente Anônimo, R$ 50.00 via Pix (Não altera saldo físico)..."
VENDA3_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"cliente_id\": null, \"barbeiro_id\": $BARBEIRO_ID, \"desconto\": 0, \"metodo_pagamento\": \"Pix\", \"itens\": [{\"servico_id\": $SERVICO_ID, \"preco_unitario\": 50.00, \"quantidade\": 1}]}" \
  "$API_URL/api/v1/pdv/venda")

echo "Resposta Venda 3: $VENDA3_RESP"
V3_ID=$(echo "$VENDA3_RESP" | jq -r '.id')
if [ -z "$V3_ID" ] || [ "$V3_ID" == "null" ]; then
  echo "✘ TESTE FALHOU: Falha ao processar Venda 3."
  exit 1
fi
echo "✔ Venda 3 registrada com sucesso (ID: $V3_ID)."

# 11. Consultar status do caixa para verificar o saldo esperado atualizado.
# Saldo esperado físico = Saldo Inicial (100) + Venda 1 Dinheiro (50) + Venda 2 Dinheiro (40) = 190.00.
echo "[+] Consultando status do caixa para verificar o saldo esperado físico acumulado..."
STATUS_RESP=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/api/v1/pdv/caixa/status")

echo "Resposta Status Caixa: $STATUS_RESP"
SALDO_ESPERADO=$(echo "$STATUS_RESP" | jq -r '.saldo_atual')
echo "Saldo esperado retornado pela API: $SALDO_ESPERADO"

# Convertendo para float e comparando
if (( $(echo "$SALDO_ESPERADO != 190.00" | bc -l) )); then
  echo "✘ TESTE FALHOU: O saldo esperado do caixa deveria ser R$ 190.00 (100 + 50 + 40), obtido: R$ $SALDO_ESPERADO."
  exit 1
fi
echo "✔ Integração de Caixa (soma de vendas físicas em dinheiro) validada com sucesso!"

# 12. Fechar o caixa informando o saldo esperado correto.
echo "[+] Fechando o caixa informando o saldo esperado de R$ 190.00..."
FECHAR_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"saldo_informado": 190.00}' \
  "$API_URL/api/v1/pdv/caixa/fechar")

echo "Resposta Fechamento Caixa: $FECHAR_RESP"
FECHAR_ID=$(echo "$FECHAR_RESP" | jq -r '.id')
if [ -z "$FECHAR_ID" ] || [ "$FECHAR_ID" == "null" ]; then
  echo "✘ TESTE FALHOU: Falha ao fechar o caixa."
  exit 1
fi
echo "✔ Caixa fechado com sucesso."

# 13. Limpar registros do banco criados pelo teste para manter o banco limpo
echo "[+] Limpando dados do teste do banco de dados..."
db_exec "DELETE FROM vendaitens WHERE vendaid IN (SELECT id FROM vendas WHERE caixaid=$CAIXA_ID);"
db_exec "DELETE FROM vendas WHERE caixaid=$CAIXA_ID;"
db_exec "DELETE FROM movimentacoescaixa WHERE caixaid=$CAIXA_ID;"
db_exec "DELETE FROM caixas WHERE id=$CAIXA_ID;"
db_exec "DELETE FROM agendamentos WHERE clienteid=$CLIENTE_ID OR barbeiroid=$BARBEIRO_ID;"
db_exec "DELETE FROM progressocliente WHERE clienteid=$CLIENTE_ID;"
db_exec "DELETE FROM usuarios WHERE id IN ($CLIENTE_ID, $BARBEIRO_ID);"
db_exec "DELETE FROM servicos WHERE id=$SERVICO_ID;"

echo "===== TODOS OS TESTES E2E DO PDV CHECKOUT PASSARAM COM SUCESSO! ====="
