# 🤖 Guia Prático de Engenharia de IA - RuivoBarber

Este guia orienta o Engenheiro de IA (**Mark**, **Rodrigo** e **Igor**) a atuar na direção estratégica do projeto, utilizando o agente **Antigravity**. 

Aqui, adotamos o princípio da **Abstração Total de Código (Zero Code)** para o humano. O Engenheiro humano foca na lógica de negócio e na arquitetura de IA, enquanto a IA executa os códigos e a infraestrutura técnica nos bastidores.

---

## 🧭 1. O Papel do Engenheiro de IA: Tradução Funcional
O Engenheiro de IA não escreve código de programação (Go, React, SQL). Ele atua traduzindo os requisitos de negócio em **Fluxos Funcionais** para o agente de IA:

| O que o Cliente/Usuário final precisa | O que o Engenheiro de IA pede para a IA fazer | O que a IA executa nos bastidores |
| :--- | :--- | :--- |
| "Quero poder fazer login com segurança na minha conta de Administrador." | "Conecte a tela de login real para validar as credenciais e guardar a chave de acesso." | Implementa `POST /api/v1/auth/login` no backend e armazena o token JWT no `localStorage` do frontend. |
| "Se eu digitar um link que não existe, quero ver um aviso claro de página não encontrada." | "Corrija o comportamento de páginas não encontradas para retornar o status 404." | Ajusta a ordem dos middlewares no Go/Fiber para tratar rotas inválidas antes de validar o token JWT. |

---

## ⚙️ 2. Arquitetura Técnica da Engenharia de IA
Embora você não precise saber sintaxe de código, como Engenheiro de IA você precisa entender os componentes técnicos que controlam o **Agente de IA**:

### A. O Modelo Context Context Protocol (MCP)
O **MCP** é a tecnologia que conecta a inteligência do LLM a ferramentas e APIs do mundo real.
*   **Como funciona a comunicação (Ex: GitHub Projects)**: O agente de IA não acessa o GitHub diretamente por mágica. Ele usa um servidor MCP configurado no ambiente local. O agente traduz a solicitação em uma consulta **GraphQL** (enviada via HTTP POST) usando o token de acesso pessoal (`personal access token`), criando cartões (issues) e movendo-os entre as colunas do Kanban (`Todo`, `In Progress`, `Done`).
*   **Por que isso importa**: Se um serviço externo falhar (como o GitHub), o Engenheiro de IA deve saber que o problema está na conexão do servidor MCP ou nas credenciais do token, e não no código da aplicação.

### B. Tokens, Janela de Contexto e Compactação
*   **Tokens**: LLMs leem dados em pedaços chamados tokens. Cada arquivo que a IA lê, cada comando que ela executa e cada resposta gerada consome tokens.
*   **Janela de Contexto**: É a "memória de trabalho" da IA em tempo de execução. Se a conversa ficar muito longa, o Antigravity realiza uma **Compactação Automática** do histórico para liberar memória (tokens).
*   **Controle de IA**: O Engenheiro de IA deve instruir o agente de forma concisa para evitar o desperdício de tokens, o que otimiza a velocidade de resposta e previne a perda de contexto essencial.

### C. Limites de Taxa da API (Rate Limits)
O Google Gemini possui limites de:
*   **RPM** (Requisições por Minuto)
*   **TPM** (Tokens por Minuto)
*   **HTTP 429 (Too Many Requests)**: Ocorre quando enviamos muitos dados de uma vez. O Engenheiro de IA deve orientar o agente a usar **Exponential Backoff** (pausas progressivas) e evitar paralelizar muitos sub-agentes simultâneos para respeitar essa cota.

### D. Rastreamento e Alinhamento do Agente
Para evitar que o agente de IA se desvie do objetivo durante tarefas longas, o Engenheiro monitora três arquivos locais gerados na pasta de dados do aplicativo (`.gemini/antigravity/brain/...`):
*   `implementation_plan.md`: O plano de design arquitetural sugerido pela IA e aprovado pelo Engenheiro antes da escrita de código.
*   `task.md`: O checklist dinâmico de tarefas ativas e concluídas.
*   `walkthrough.md`: O relatório técnico pós-execução detalhando o que foi testado e os resultados.
