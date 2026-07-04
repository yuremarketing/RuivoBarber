# 📋 Backlog Técnico e Engenharia de Software - Sistema de Agendamento RuivoBarber

> ⚠️ **AVISO DE VISÃO DE LONGO PRAZO**
> Este documento representa a visão técnica estrutural, o plano de engenharia de dados (MLOps) e as metas de longo prazo da plataforma.
> 
> *Nota de Status:* Antes de prosseguirmos com expansões futuras descritas abaixo, a prioridade máxima e exclusiva da equipe de engenharia hoje é codificar e entregar a **Issue #66 (Go-Live)**.

Este repositório documenta as especificações técnicas, padrões de arquitetura de dados e de software, requisitos de segurança e de negócio estruturados para o Sistema de Agendamento da **RuivoBarber**.

Este backlog foi elaborado sob a ótica de engenharia sênior e governança de dados, visando assegurar a integridade transacional, conformidade legal, segurança nas transações financeiras e prontidão para modelos analíticos preditivos (MLOps). Ele serve como um guia completo para recrutadores e engenheiros de software avaliarem a maturidade técnica do projeto.

---

## 🏛️ Padrões de Arquitetura e Engenharia Aplicados

Para atender a requisitos de alta escalabilidade, manutenibilidade e segurança, o projeto adota os seguintes pilares:

1. **Separação de Camadas (Clean Architecture / Hexagonal Ports & Adapters)**
   - O domínio da aplicação e as regras de negócio são isolados de dependências externas (banco de dados, frameworks HTTP, gateways de mensageria).
   - O backend em Go estruturado através de portas ([ports](file:///c:/Users/islam/OneDrive/Documentos/ruivobarber/backend/internal/core/ports/cliente_repository.go)) e adaptadores ([adapters](file:///c:/Users/islam/OneDrive/Documentos/ruivobarber/backend/internal/adapters/repositories/cliente_pg_repository.go)) garante que a infraestrutura possa ser substituída ou atualizada sem impactos colaterais.

2. **Defesa em Profundidade e Segurança de Rede**
   - Controle rígido de perímetro com limitador de taxa para mitigar abusos de APIs e tentativas de negação de serviço.
   - Validação estrita e sanitização de dados de entrada na camada HTTP ([handlers](file:///c:/Users/islam/OneDrive/Documentos/ruivobarber/backend/internal/adapters/handlers/cliente_handler.go)) para combater injeção de parâmetros maliciosos (SQL Injection, XSS).
   - Proteção de sessões e privilégios utilizando tokens JWT com assinatura criptográfica segura e validação no middleware de autorização por cargo.

3. **Consistência e Concorrência Transacional**
   - Controle transacional estrito para evitar condições de corrida (*Race Conditions*) em recursos críticos como o estoque de insumos e a alocação de horários de profissionais.
   - Uso planejado de bloqueio pessimista (Row-level Locks como `SELECT ... FOR UPDATE`) ou isolamento transacional serializável no PostgreSQL para blindar o sistema contra overbooking.

4. **Governança de Dados e Privacidade (Privacidade por Design)**
   - Coleta transparente de dados com base de consentimento explícito e armazenado.
   - Rotinas automatizadas de pseudonimização/anonimização em conformidade com as diretrizes legais brasileiras, removendo dados identificáveis sem quebrar as dependências relacionais do banco ou distorcer métricas históricas de vendas.

5. **Preparação para Modelagem Preditiva (MLOps)**
   - Estruturação de dados limpos em tabelas de metadados desde o DDL inicial para facilitar a extração de recursos (*Feature Engineering*).
   - Captura de métricas comportamentais (assiduidade, temporalidade e antecedência de reservas) prontas para alimentar modelos locais de machine learning visando a redução de *No-Shows*.

---

## 🎯 Backlog de Issues & Tasks

### [Task #13 (38-A)] Ajuste de Fuso Horário de Brasília (America/Sao_Paulo) nas Três Camadas
*   **Componente**: Infraestrutura / Fuso Horário
*   **Status**: ⏳ Pendente
*   **Descrição Técnica Detalhada**:
    *   **Banco de Dados**: Configurar todas as colunas de data/hora para usar o tipo de dado `TIMESTAMP WITH TIME ZONE` (`TIMESTAMPTZ`) no PostgreSQL, garantindo que o offset GMT-3/GMT-2 (horário de verão) seja mantido de forma nativa.
    *   **Backend**: Padronizar a inicialização do fuso horário da aplicação utilizando a localização `America/Sao_Paulo` (GMT-3) globalmente no Go via `time.LoadLocation` ou equivalente. Substituir chamadas diretas a fusos locais do servidor (que podem ser UTC em serviços de nuvem) por parses baseados nesse fuso específico.
    *   **Frontend**: Implementar a renderização local no navegador do cliente, parseando as strings ISO retornadas pela API no fuso `America/Sao_Paulo` e garantindo que o fuso do dispositivo do cliente não cause distorções visuais nos horários disponíveis de agendamento.
*   **Mecanismos de Segurança & Integridade**:
    *   Validação estrita na recepção do payload para impedir que requisições com fusos UTC arbitrários injetem datas retroativas no banco de dados.
    *   Criação de testes unitários para validar a correspondência temporal de agendamentos em diferentes fusos horários de entrada.
*   **Critérios de Aceitação (Baseados no Impacto de Negócio)**:
    *   *Bloqueio de Erros de Agendamento Fantasma*: Nenhum cliente pode agendar serviços em horários já passados ou datas retroativas.
    *   *Exibição Consistente*: Os relatórios financeiros de fechamento diário e exibições na agenda do barbeiro devem bater exatamente com o horário comercial oficial de Brasília (GMT-3), independentemente da localização do servidor onde a aplicação está hospedada.

---

### [Task #25 (38-F)] Controle de Concorrência Transacional e Prevenção de Overbooking
*   **Componente**: Banco de Dados / Concorrência
*   **Status**: ⏳ Pendente
*   **Descrição Técnica Detalhada**:
    *   **Mecanismo de Lock**: Implementação de bloqueios pessimistas no PostgreSQL utilizando `SELECT ... FOR UPDATE` nas consultas que determinam a disponibilidade do profissional e do horário antes da inserção na tabela `Agendamentos`.
    *   **Isolamento Transacional**: Configurar o nível de isolamento da transação de criação do agendamento para `SERIALIZABLE` ou reforçar a integridade de chave única na tabela de agendamentos (`BarbeiroID`, `DataHora`) com status ativo.
    *   **Controle de Retransmissão**: Retornar mensagens de erro com códigos de status HTTP apropriados (`409 Conflict`) quando uma transação falhar por concorrência de recursos, orientando o cliente a escolher outro horário disponível.
*   **Mecanismos de Segurança & Integridade**:
    *   Evitar travamentos permanentes (*Deadlocks*) ordenando os locks de forma consistente.
    *   Garantir a liberação dos recursos no banco de dados através da instrução de Rollback em caso de falha antes do Commit final.
*   **Critérios de Aceitação (Baseados no Impacto de Negócio)**:
    *   *Proteção da Reputação da Barbearia*: Sob nenhuma circunstância (incluindo picos de acessos concorrentes) o sistema poderá permitir a reserva de um mesmo slot de horário de um barbeiro para dois clientes diferentes, evitando o Overbooking no lançamento.
    *   *Integridade Transacional*: O sistema deve se recuperar graciosamente de concorrências sem corromper o estado do banco.

---

### [Task #24 (38-C)] Algoritmo de Validação de Slots de Duração Variável
*   **Componente**: Backend / Regras de Negócio
*   **Status**: ⏳ Pendente
*   **Descrição Técnica Detalhada**:
    *   **Endpoint**: Desenvolvimento do endpoint `GET /api/v1/barbeiros/:id/agenda` no [cliente_handler.go](file:///c:/Users/islam/OneDrive/Documentos/ruivobarber/backend/internal/adapters/handlers/cliente_handler.go).
    *   **Processamento da Matriz**: O algoritmo lê a jornada configurada na tabela `BarbeiroDisponibilidade` para o dia da semana correspondente, subtrai os bloqueios cadastrados em `BarbeiroBloqueios` e os slots já reservados em `Agendamentos`.
    *   **Reserva Consecutiva**: Se o serviço escolhido durar 1 hora (60 minutos), o algoritmo deve varrer a matriz de slots e validar se existem **pelo menos dois blocos consecutivos de 30 minutos livres** para o mesmo profissional. Serviços menores (ex: 30 minutos) exigem apenas um bloco livre.
*   **Mecanismos de Segurança & Integridade**:
    *   Validação no backend das entradas recebidas (garantindo IDs de barbeiro e datas válidas) para prevenir injeção de parâmetros maliciosos.
    *   O cálculo de slots livres deve ignorar agendamentos que já tenham status de `Cancelado` ou `Falta`.
*   **Critérios de Aceitação (Baseados no Impacto de Negócio)**:
    *   *Agenda Matematicamente Viável*: Evitar erros de sobreposição onde um serviço de longa duração invade o horário de outro agendamento.
    *   *Exatidão de Oferta*: O cliente só verá horários que de fato acomodam a duração total do serviço solicitado.

---

### [Task #14 (38-B)] Componente Interativo de Agendamento Passo a Passo (BookingWizard)
*   **Componente**: Frontend / UX
*   **Status**: ⏳ Pendente
*   **Descrição Técnica Detalhada**:
    *   **Estrutura de Componentes**: Criação do componente `BookingWizard.jsx` estruturado em um fluxo sequencial e interativo (Wizard) com os seguintes passos:
        1.  *Escolha do Barbeiro*: Exibição de cards contendo fotos reais do profissional e sua classificação por estrelas de avaliações anteriores.
        2.  *Seleção do Serviço*: Listagem dinâmica com preço, duração e indicação de bônus de XP.
        3.  *Calendário e Slots*: Calendário reativo integrado à API que exibe apenas as datas viáveis e os slots livres gerados pelo endpoint da Task #24.
        4.  *Revisão e Confirmação*: Resumo detalhado com opção para confirmação do agendamento.
    *   **UX & Estados**: Gerenciamento de estado local limpo para transição suave de passos, permitindo o retorno a passos anteriores sem perda dos dados já selecionados.
*   **Mecanismos de Segurança & Integridade**:
    *   Proteção contra submissões duplas (*double submission*) desabilitando o botão de confirmação durante a requisição de processamento.
    *   Garantia de que os dados do agendamento enviados sejam consistentes com o JWT do cliente autenticado.
*   **Critérios de Aceitação (Baseados no Impacto de Negócio)**:
    *   *Conversão de Agendamentos*: A interface deve ser fluida, limpa e responsiva em dispositivos móveis (onde se concentram mais de 80% dos agendamentos), otimizando a experiência do cliente e maximizando a taxa de conversão de agendamentos finalizados.

---

### [Task #26 (#67)] Governança de Dados, Consentimento Legal e Rotina de Pseudonimização
*   **Componente**: Segurança / LGPD
*   **Status**: ⏳ Pendente
*   **Descrição Técnica Detalhada**:
    *   **Consentimento Explícito**: Adicionar a coluna `whatsapp_consent` do tipo `BOOLEAN` na tabela `Usuarios`. No frontend, incluir um checkbox obrigatório no formulário de cadastro, exigindo o consentimento explícito do cliente para receber notificações de agendamentos e promoções via WhatsApp.
    *   **Rotina de Pseudonimização**: Criar uma rotina em Go/SQL para atender a requisições de exclusão de conta ("Direito ao Esquecimento"). A rotina deve substituir as informações pessoais (`Nome`, `Login`, `Senha`, `AvatarURL`, `ChavePix`) por valores gerados aleatoriamente ou strings mascaradas (ex: `CLIENTE_EXCLUIDO_XXXX`), mantendo os relacionamentos e as chaves estrangeiras intactos para não corromper relatórios financeiros históricos e estatísticas de uso.
*   **Mecanismos de Segurança & Integridade**:
    *   Garantir criptografia e hashing robusto na geração de dados substitutos.
    *   Restringir o acesso a esta rotina estritamente a usuários administradores com autenticação MFA ou autorização especial baseada em privilégios elevados.
*   **Critérios de Aceitação (Baseados no Impacto de Negócio)**:
    *   *Conformidade Jurídica*: Atendimento completo à legislação de proteção de dados brasileira vigente, eliminando riscos de sanções administrativas e multas judiciais, demonstrando conformidade estrita com a LGPD.

---

### [Task #16 (38-D)] Sistema de Gorjeta Digital Integrado ao Payload Pix
*   **Componente**: Recurso / Integração Financeira
*   **Status**: ✅ Concluído (Pronto para integração de interface no Frontend)
*   **Descrição Técnica Detalhada**:
    *   **Banco de Dados**: Criar a tabela `Gorjetas` para rastrear as doações por barbeiro e agendamento associado, registrando o valor da gorjeta e a chave Pix de destino do profissional.
    *   **Cálculo Dinâmico**: Implementar rotina matemática nativa para geração de payload Pix estático (padrão EMV CO) somando dinamicamente o valor da gorjeta opcional escolhida pelo cliente ao valor do corte, gerando um código Copia e Cola formatado e calculando o CRC16 checksum nativamente em Go para validação do aplicativo bancário.
    *   **Frontend**: Desenvolver modal de gorjeta no fluxo de checkout oferecendo opções percentuais (ex: 5%, 10%, 15%) ou valor livre, e exibir a string do Pix Copia e Cola junto ao QR Code gerado.
*   **Mecanismos de Segurança & Integridade**:
    *   Sanitização rigorosa da chave Pix do barbeiro para mitigar ataques de injeção de parâmetros no payload do Pix BR Code.
    *   Cálculo exato de duas casas decimais no valor final para prevenir inconsistências de centavos que invalidem o QR Code Pix.
*   **Critérios de Aceitação (Baseados no Impacto de Negócio)**:
    *   *Aumento do Ticket Médio*: Fornecer um canal direto e simplificado no checkout para recompensar a equipe de barbeiros, aumentando a retenção de talentos e o faturamento indireto da equipe de profissionais.

---

### [Task #17 (38-E)] Gatilho Automático para Avaliação e Reputação Digital (SEO Local)
*   **Componente**: Recurso / Marketing
*   **Status**: ⏳ Pendente
*   **Descrição Técnica Detalhada**:
    *   **Trigger de Status**: Desenvolver um listener ou hook na transição do status do agendamento para `Concluido` na tabela `Agendamentos`.
    *   **Envio de Mensagem**: Disparar uma notificação assíncrona automatizada (via WhatsApp API integrada no `NotificationWorker`) contendo um link curto e parametrizado (ex: `https://ruivobarber.com.br/r/:barbeiro_id`) que redireciona o cliente para a página de avaliações do Google Meu Negócio da barbearia.
*   **Mecanismos de Segurança & Integridade**:
    *   Implementar controle de concorrência e idempotência para garantir que apenas uma notificação seja disparada por atendimento concluído, evitando spam e incômodo ao usuário.
    *   Sanitizar a composição do link curto de redirecionamento para evitar desvios maliciosos (*open redirect vulnerabilities*).
*   **Critérios de Aceitação (Baseados no Impacto de Negócio)**:
    *   *Alavancagem de Prova Social*: Impulsionar organicamente as avaliações no Google da barbearia, elevando o ranking de busca local (SEO local) de forma orgânica e atraindo novos clientes locais.

---

### [Task #27 (#68)] Modelagem de Metadados Preditivos de Agendamento (MLOps Prep)
*   **Componente**: Engenharia de Dados / IA
*   **Status**: ⏳ Pendente
*   **Descrição Técnica Detalhada**:
    *   **Modelagem de Dados**: Criação da tabela de metadados preditivos `MetadadosPredicao` associada a cada novo agendamento inserido na tabela `Agendamentos`.
    *   **Extração de Atributos**: Armazenar variáveis cruciais no momento em que o agendamento é criado:
        *   `Antecedência`: Diferença exata em horas entre o instante da reserva (`CriadoEm`) e a data/hora agendada (`DataHora`).
        *   `Fator Temporal`: Indexadores numéricos representando o dia da semana (0-6) e a faixa horária do serviço.
        *   `Assiduidade Histórica`: Relação contínua calculada em tempo de execução das reservas concluídas anteriores contra faltas históricas registradas pelo mesmo cliente.
*   **Mecanismos de Segurança & Integridade**:
    *   Isolar a escrita desses metadados na transação de agendamento de forma assíncrona ou não-bloqueante para evitar overhead no banco de dados na hora da criação do agendamento.
    *   Garantir integridade referencial nas tabelas e exclusão em cascata condizente em caso de exclusão/pseudonimização de usuários (LGPD).
*   **Critérios de Aceitação (Baseados no Impacto de Negócio)**:
    *   *Preparação para Inteligência Artificial*: Base de dados estruturada e enriquecida no padrão clássico de datasets para treinar algoritmos locais de machine learning. Isso prepara a arquitetura para plugar modelos preditivos de detecção de No-Show no futuro, auxiliando o negócio a tomar decisões proativas de confirmação de horários de alto risco.

---

### [Task #28 (#69)] Bloqueio e Liberação de Horários Específicos do Barbeiro (Slot-Level Blocking)
*   **Componente**: Backend & Frontend / Gestão de Horários
*   **Status**: ⏳ Pendente
*   **Descrição Técnica Detalhada**:
    *   **Banco de Dados**: Alterar a tabela `BarbeiroBloqueios` para adicionar `HoraInicio TIME NULL` e `HoraFim TIME NULL`. Dropar a constraint única `UNIQUE(BarbeiroID, DataBloqueio)`.
    *   **Backend**: 
        *   Atualizar a estrutura e o scanner SQL do repositório para suportar os novos campos de hora nulos.
        *   Adaptar o algoritmo `ObterAgendaBarbeiro` para que, se houver um bloqueio com horas definidas (ex: `12:00` a `13:30`), ele invalide apenas os slots de 30 minutos contidos nesse intervalo, mantendo os outros horários do dia como livres.
        *   Caso `HoraInicio` e `HoraFim` sejam nulos, manter o comportamento de bloquear o dia completo (retrocompatibilidade).
    *   **Frontend**:
        *   Atualizar a tela `AgendaConfigPage.jsx` para incluir campos opcionais de hora de início e fim ao cadastrar um bloqueio.
        *   Exibir de forma clara as faixas de horário bloqueadas na lista de bloqueios ativos.
*   **Mecanismos de Segurança & Integridade**:
    *   Validação no backend para garantir que `HoraInicio` seja anterior a `HoraFim`.
    *   Validar conflito de intervalos ao criar novos bloqueios.
*   **Critérios de Aceitação (Baseados no Impacto de Negócio)**:
    *   *Flexibilidade de Escala*: Permitir que barbeiros agendem reuniões, intervalos de almoço ou folgas pontuais sem precisar inutilizar o dia inteiro de trabalho.
    *   *Precisão de Oferta*: O cliente só conseguirá agendar em slots onde o profissional de fato não esteja em horário de intervalo/bloqueio.
