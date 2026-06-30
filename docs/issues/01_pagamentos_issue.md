# Epic/Issue: Configuração dos Modos de Pagamento no PDV

## 📌 Contexto
Atualmente, o sistema de Caixa (PDV) da RuivoBarber assume que o usuário sempre pagará em dinheiro ou permite a escolha sem um controle administrativo centralizado. É necessário que o Administrador da barbearia possa:
1. Ligar/desligar métodos de pagamento aceitos no momento (ex: desligar pagamento em cartão se a maquininha quebrar).
2. Configurar chaves de recebimento online (como a Chave PIX e o Token do Mercado Pago) para futuras integrações de QRCode e pagamentos automatizados via webhook.

---

## 🛠️ Requisitos Técnicos

### 1. Banco de Dados & Backend (Go)
**Tabela `Configuracoes`**
Criar a migration `010_add_pagamentos_config.sql` com as seguintes colunas:
- `AceitaDinheiro BOOLEAN DEFAULT TRUE`
- `AceitaPix BOOLEAN DEFAULT TRUE`
- `AceitaCartao BOOLEAN DEFAULT TRUE`
- `ChavePix VARCHAR(255) DEFAULT ''`
- `MercadoPagoToken VARCHAR(255) DEFAULT ''`

**Domain & Repository**
- Atualizar a struct de domínio `Configuracoes` (no arquivo `cliente.go`) para espelhar essas 5 novas propriedades.
- No `cliente_pg_repository.go`:
  - Atualizar o `SELECT` na função `ObterConfiguracoes`.
  - Atualizar os comandos `INSERT` e `UPDATE` na função `SalvarConfiguracoes` para gravar as novas chaves.

**HTTP Handlers**
- O `cliente_handler.go` precisa fazer o bind correto dessas chaves JSON ao receber requisições de salvar as configurações da barbearia.

---

### 2. Frontend (React) - Painel Administrativo
**Arquivo:** `ConfiguracoesPage.jsx`
- Criar uma nova área de **"Meios de Pagamento"** (dentro da aba de sistema).
- **Toggles (On/Off):** Adicionar botões no estilo switch para ativar/desativar "Dinheiro", "Pix" e "Cartões (Débito/Crédito)".
- **Inputs de Texto:** Criar campos seguros para o administrador colar a sua *Chave Pix* e o *Access Token do Mercado Pago*.
- Ligar os novos campos ao state do React e atualizar a função `salvarAdmin()` para enviar o Payload completo.

---

### 3. Frontend (React) - Caixa (PDV)
**Arquivo:** `CheckoutPage.jsx`
- Quando a página de Caixa carregar, invocar o endpoint de configurações (`fetchConfiguracoes()`) para descobrir quais pagamentos a barbearia aceita.
- Na hora de renderizar os métodos de pagamento (onde o barbeiro clica em Dinheiro, Pix, Cartão), **filtrar as opções**.
- Exemplo: Se `AceitaCartao == false`, o botão "Cartão de Crédito/Débito" nem deve aparecer na interface do caixa, impedindo o operador de fechar vendas nesse método temporariamente.

---

## ✅ Critérios de Aceite
- [ ] Administrador consegue alterar a configuração no front-end e receber toast verde de sucesso.
- [ ] Recarregar a aba de configurações traz os valores gravados no banco corretamente.
- [ ] No Caixa, se o Administrador desligar a flag "Pix", o barbeiro não poderá fechar a venda usando "Pix".
