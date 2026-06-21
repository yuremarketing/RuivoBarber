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
- [x] Configuração de usuário da tela de cliente (Task 33)
  - [x] Implementar formulário/tela para alteração de dados cadastrais (nome, login, senha) diretamente no painel do cliente.


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
- [x] [Segurança] Restrições de Login Social e Contas Fictícias (Task 34)
  - [x] Restringir login do Google exclusivamente ao cargo Cliente e sementar contas fictícias com hashes bcrypt para testes.

---

## 🎮 8. Novos Recursos de Engajamento e Gestão Concluídos
- [x] [Seasons] Task 37: Sistema de Temporadas RPG (Seasons)
  - [x] Backend: Domínio, repositório, serviço e endpoints para Temporadas.
  - [x] Frontend: Painel de controle no Adm, Alerta de temporada inativa e widget no painel do Cliente.
- [x] [Agenda] Task 38: Agenda de Barbeiros e Marcação Avançada
  - [x] Backend: API para leitura e bloqueio de horários baseados no barbeiro escolhido.
  - [x] Frontend: Seleção de barbeiro com calendário de horários disponíveis no agendamento.
- [x] [AI-Chatbot] Task 39: Integração de Inteligência Artificial e Chatbot com WhatsApp/Webhooks
  - [x] Backend: Criar receiver de webhook para mensagens de WhatsApp, repassar para IA com histórico e responder via API do WhatsApp.
  - [x] Frontend: Melhorar tela de Configurações no painel do Administrador para salvar/testar as credenciais da API do WhatsApp e a URL do Webhook.
- [x] [Guilds] Task 43: Modelagem e Tabelas de Clãs/Guildas
  - [x] Backend: Criar esquema SQL e tabelas de Guildas e membros associados no banco de dados.
- [x] [Avatar] Task 58: Customização do Card de Jogador (Foto do Perfil, Upload de Imagem e Avatares RPG)
  - [x] Frontend: Implementar compressão client-side (máx 50KB, .webp) usando API Canvas para foto de perfil do cliente.
  - [x] Frontend/Backend: Disponibilizar biblioteca de avatares RPG pré-carregados (presets) leves e salvar apenas URL da imagem no banco de dados.
- [x] [Guilds] Task 44: Rota de Criação e Convite para Clãs (Backend)
  - [x] Backend: Implementar criação de clãs, relacionamentos de membros e rota de convite.
- [x] [Guilds] Task 45: Lógica de Subida de Nível de Clãs (XP Coletivo) (Backend)
  - [x] Backend: Implementar acumulação de XP coletivo (+1 por corte) e subida de nível de clãs.
- [x] [Badges] Task 51: Sistema de Conquistas Individuais por Badges (Medalhas) (Backend)
  - [x] Backend: Triggers de conquistas e bônus de XP no banco para os primeiros marcos (cortes/nível).
- [x] [Store] Task 49: Loja de Itens Virtuais RPG (Troca de XP por itens do perfil) (Backend)
  - [x] Backend: Permitir resgatar cosméticos e molduras para o PlayerCard usando moedas/XP.

---

## 🛡️ 9. Backlog Reorganizado e Priorizado

### 🕒 Correções Críticas
- [x] [Fix] Task 38-A: Ajuste de Fuso Horário de Brasília (America/Sao_Paulo) no Backend e Frontend (Issue #13)

### ⚙️ Backend (Lógica Go e Banco de Dados)
- [x] [Guilds] Task 47: Sistema de Missões Semanais do Clã (Quests de Guilda) (Backend)
- [x] [Loyalty] Task 54: Recompensa por Acesso Diário (Daily Streak / Login Diário)
- [x] [Guilds] Task 48: Eventos Cooperativos de "Raid" (Meta Comunitária de Cortes) (Backend)
- [x] [Ops] Task 56: Notificação Automática de Conquistas e Nível via WhatsApp
- [x] [Lives] Task 42: Integração com Transmissões de Lives ao Vivo (Backend & Frontend)
- [x] [Wizard/Profile] Task 38-BC: Banco de Dados e Backend para Perfis de Barbeiros (Foto e Avaliação Média) (Issue #15)
- [x] [Checkout] Task 38-D: Backend e Banco de Dados para Gorjeta Digital via Pix (Chave Pix e QR Code) (Issue #16)
- [ ] [Review/Rewards] Task 38-E/40: Banco de Dados e Rota Unificada do "Último Corte" com flag de Avaliação Pendente (Issues #5 e #17)
- [ ] [PDV-DB] Task 61: Modelagem e Tabelas do Fluxo Financeiro (SQL) (Issue #18)
- [ ] [PDV-BE] Task 62: Controle de Sessão de Caixa (Abertura/Fechamento) (Issue #19)
- [ ] [PDV-BE] Task 63: Processamento de Venda e Integração de Fidelidade (Issue #20)

### 🖥️ Frontend (Telas React)
- [ ] [Wizard] Task 38-BC-FE: Wizard de Agendamento Passo a Passo (BookingWizard) com Fotos e Estrelas Reais (Issue #14/15)
- [x] [Checkout] Task 38-D-FE: Painel do Admin para Cadastrar Chave Pix e Modal de Gorjeta para Clientes (Issue #16)
- [ ] [Review/Rewards] Task 38-E/40-FE: Modal de Avaliação Pós-Atendimento e Card do "Último Corte" no Portal do Cliente (Issues #5 e #17)
- [ ] [PDV-FE] Task 64: Tela de Abertura/Fechamento e Painel do Caixa (Issue #21)
- [ ] [PDV-FE] Task 65: Tela de Checkout / Caixa Registradora (Interface PDV) (Issue #22)
- [ ] [PDV-FE/BE] Task 66: Relatório Financeiro e Comissões dos Barbeiros (Issue #23)
- [ ] [Queue] Task 41: Controle de Presença (Check-in/Check-out) e Tempo Médio
  - [x] Backend: Gerenciamento do status "Em Cadeira" e cálculo automático de tempo médio do corte.
  - [ ] Frontend: Painel operacional administrativo para controle físico da fila da barbearia (Issue #6)
- [ ] [Badges] Task 52: Vitrine de Badges no PlayerCard do Cliente
- [ ] [Store] Task 50: Inventário do Cliente no Frontend (Bolsa de Itens/Poções)
- [ ] [Fame] Task 57: Galeria Histórica de Lendários (Hall of Fame)

### 🎨 UX (Experiência, Animações e Mídias)
- [ ] [UX-Audio] Task 55: Efeitos Sonoros e Efeitos Visuais de Level Up no Frontend
  - [ ] Frontend: Integrar transições com sons arcade e confetes ao subir de nível ou resgatar cupons.

### 🚀 DevOps / Infraestrutura (CI/CD)
- [ ] [DevOps] Task 60: Implantação do Harness.io (CI/CD)



