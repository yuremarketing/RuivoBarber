# 📋 TASKS.md - Roadmap de Engenharia RuivoBarber (MVP)

## 📌 Contexto e Governança
Este arquivo é o mapa de execução oficial do projeto. O sistema segue a **Arquitetura Hexagonal (Ports and Adapters)** no backend (Go) e o isolamento de regras de negócios via **Services/Hooks** no frontend (React). 
> **Regra para Agentes de IA:** Sempre leia este arquivo antes de iniciar uma tarefa, escolha uma tarefa não marcada, implemente-a seguindo as regras de `.antigravityrules`, e ao final, marque a caixa com `[x]`.

---

## 🏗️ 1. Infraestrutura e Banco de Dados (Base do `init.sql`)
- [x] Criar `docker-compose.yml` para orquestração (db, backend, frontend).
- [x] Criar `scripts/init.sql` com as tabelas de Usuários, Serviços, Agendamentos, MovimentaçãoFinanceira, Niveis e ProgressoCliente.
- [x] Inserir a progressão de Níveis no banco: Iniciante (100 XP), Barba de Respeito (300 XP), Lenda da Navalha (600 XP).
- [x] Implementar limitador de taxa e defesa da API (`ratelimiter.go`) para chamadas externas.

---

## ⚙️ 2. Backend (Go) - Casos de Uso e Domínios

### 📅 Agendamentos & Fidelização (Sistema de XP)
- [x] **Implementar Conclusão de Serviço (`POST /api/v1/atendimentos/concluir`)**
  - [x] Abrir transação única no banco (Transaction Lock).
  - [x] Dar baixa automática nos produtos utilizados (Billing/Inventory Context).
  - [x] Calcular e adicionar o XP na tabela `ProgressoCliente`.
- [x] **Implementar Penalidade de Falta (`POST /api/v1/atendimentos/falta`)**
  - [x] Regra Anti No-Show: Deduzir exatamente 100 XP do cliente em caso de falta sem cancelamento.
- [ ] **Refatorar Consulta de Cliente (`GET /api/v1/clientes`)**
  - [x] Mapear JSON integrando o LEFT JOIN para expor "xp" numérico e a string "nivel" (ex: "Barba de Respeito").

### 🎟️ Gestão de Cupons
- [ ] **Criar Rota de Resgate Manual (`POST /api/v1/cupons/resgatar`)**
  - [ ] Validar se o `XPAtual` do cliente atinge o exigido pelo nível.
  - [ ] Gerar código único de desconto vinculado ao `ClienteID`.
- [ ] **Criar Rota de Validação Admin (`POST /api/v1/cupons/validar`)**
  - [ ] Consultar e invalidar o cupom assim que ele for inserido no pagamento na barbearia.

### 📱 Mensageria (Notificações)
- [ ] Criar `NotificationWorker` assíncrono para integração com o WhatsApp.
- [ ] Disparar mensagem de "XP Adquirido" após o fechamento do serviço.
- [ ] Regra de Prova Social: Injetar link do *Google Meu Negócio* caso o cliente suba para o nível máximo ("Lenda da Navalha").

---

## 🎨 3. Frontend (React/Vite) - Experiência "Arcade Gamificada"

### 👤 Interface do Cliente
- [ ] Desenvolver componente `PlayerCard.jsx`.
  - [ ] Exibir avatar com moldura dinâmica dependendo da patente (ex: borda de ouro para Lenda da Navalha).
- [ ] Desenvolver componente `RpgProgressBar.jsx`.
  - [ ] Implementar barra de progresso baseada na fórmula `(XPAtual / XPNecessario) * 100`.
  - [ ] Renderizar texto de conquistas (ex: "Faltam X cortes para a sua próxima recompensa").
- [ ] Desenvolver componente `RedeemCouponManager.jsx`.
  - [ ] Lógica visual: o botão "Resgatar Cupom" só deve ser clicável/visível quando o nível é atingido.

### 🛡️ Dashboard Administrativo
- [ ] Desenvolver componente `AdminValidationPanel.jsx`.
  - [ ] Lista de clientes qualificados para resgate e tela de inserção de cupons na hora de pagar.
- [ ] Tratamento de Erros e UX.
  - [x] Garantir que falhas de conexão (CORS/429) no `api.js` mostrem um banner amigável em vez de tela branca.

---

## 🧪 4. Validação e Testes Modulares (QA)
- [x] Criar `Test_TransactionLock`: Garantir rollback total (XP não sobe se estoque falhar).
- [x] Criar `Test_NoShowPenalty`: Validar matematicamente a dedução de 100 XP.
- [ ] Criar `Test_ProgressCalculation`: Validar a transição correta de status ao cruzar a barreira de pontos do nível.

## 🔐 5. Segurança (Pré-Produção)
- [ ] Implementar autenticação JWT (`POST /api/v1/auth/login`)
- [ ] Middleware de autorização por Cargo (Adm, Barbeiro, Cliente)
- [ ] Proteger rotas admin contra acesso de Cliente
