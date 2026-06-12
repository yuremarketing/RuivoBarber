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
- [x] **Refatorar Consulta de Cliente (`GET /api/v1/clientes`)**
  - [x] Mapear JSON integrando o LEFT JOIN para expor "xp" numérico e a string "nivel" (ex: "Barba de Respeito").

### 🎟️ Gestão de Cupons
- [x] **Criar Rota de Resgate Manual (`POST /api/v1/cupons/resgatar`)**
  - [x] Validar se o `XPAtual` do cliente atinge o exigido pelo nível.
  - [x] Gerar código único de desconto vinculado ao `ClienteID`.
- [x] **Criar Rota de Validação Admin (`POST /api/v1/cupons/validar`)**
  - [x] Consultar e invalidar o cupom assim que ele for inserido no pagamento na barbearia.

### 📱 Mensageria (Notificações)
- [x] Criar `NotificationWorker` assíncrono para integração com o WhatsApp.
- [x] Disparar mensagem de "XP Adquirido" após o fechamento do serviço.
- [x] Regra de Prova Social: Injetar link do *Google Meu Negócio* caso o cliente suba para o nível máximo ("Lenda da Navalha").

---

## 🎨 3. Frontend (React/Vite) - Experiência "Arcade Gamificada"

### 👤 Interface do Cliente
- [x] Desenvolver componente `PlayerCard.jsx`.
  - [x] Exibir avatar com moldura dinâmica dependendo da patente (ex: borda de ouro para Lenda da Navalha).
- [x] Desenvolver componente `RpgProgressBar.jsx`.
  - [x] Implementar barra de progresso baseada na fórmula `(XPAtual / XPNecessario) * 100`.
  - [x] Renderizar texto de conquistas (ex: "Faltam X cortes para a sua próxima recompensa").
- [x] Desenvolver componente `RedeemCouponManager.jsx`.
  - [x] Lógica visual: o botão "Resgatar Cupom" só deve ser clicável/visível quando o nível é atingido.

### 🛡️ Dashboard Administrativo
- [x] Desenvolver componente `AdminValidationPanel.jsx`.
  - [x] Lista de clientes qualificados para resgate e tela de inserção de cupons na hora de pagar.
- [x] Tratamento de Erros e UX.
  - [x] Garantir que falhas de conexão (CORS/429) no `api.js` mostrem um banner amigável em vez de tela branca.

---

## 🧪 4. Validação e Testes Modulares (QA)
- [x] Criar `Test_TransactionLock`: Garantir rollback total (XP não sobe se estoque falhar).
- [x] Criar `Test_NoShowPenalty`: Validar matematicamente a dedução de 100 XP.
- [x] Criar `Test_ProgressCalculation`: Validar a transição correta de status ao cruzar a barreira de pontos do nível.

## 🔐 5. Segurança (Pré-Produção)
- [x] Implementar autenticação JWT (`POST /api/v1/auth/login`)
- [x] Middleware de autorização por Cargo (Adm, Barbeiro, Cliente)
- [x] Proteger rotas admin contra acesso de Cliente

---

## 🚀 6. Deploy e Produção (Render Blueprints)
- [x] Conectar repositório GitHub ao Render e criar grupo de serviços através do blueprint `render.yaml`
- [x] Configurar conexão segura do banco de dados e homologar deploys automáticos

---

## 🤖 7. Engenharia de IA (Próximos Passos)
- [x] Adicionar Chat/Assistente Inteligente de Agendamento (Function Calling + SSE)
  - [x] Mapear as funções locais de criação de agendamento e checagem de horários no Go (Function Calling).
  - [x] Implementar streaming de tokens (SSE) no backend e no frontend React.
- [x] [AI Dev-Ops] Automatizar a descrição de encerramento nos cards do Kanban ao finalizar tarefas
  - [x] Definir o modelo de relatório técnico de fechamento para inserção automática via API do GitHub.
- [x] [Auto-Migration] Auto-inicialização do banco de dados no Render (Task 31)
  - [x] Embutir esquema SQL via go:embed no binário Go e executar migração se o banco estiver vazio.
- [x] [Integrar Google Sign-In] Configurar Google Client ID Real (Task 32)
  - [x] Integrar ID de cliente real fornecido pelo usuário e renderizar botão de login oficial do Google.

