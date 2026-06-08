# 📖 Dicionário de Dados — RuivoBarber (MVP)

Este documento define a modelagem de dados e as entidades de banco de dados (PostgreSQL) do ecossistema RuivoBarber, servindo como especificação para as Structs em Go (backend) e Interfaces em React (frontend).

---

## 👥 1. Usuários (`Usuarios`)
Armazena todos os usuários cadastrados no sistema, diferenciados por suas permissões e cargos.

| Campo | Tipo SQL | Go Struct | React Field | Descrição |
|---|---|---|---|---|
| **id** (PK) | SERIAL | `int` | `number` | Identificador único do usuário. |
| **nome** | VARCHAR(100) | `string` | `string` | Nome completo do usuário. |
| **cargo** | VARCHAR(20) | `string` | `string` | Cargo/Nível de acesso. Validações: `Adm`, `Barbeiro`, `Cliente`. |
| **login** | VARCHAR(50) | `string` | `string` | Login único para autenticação. |
| **senha** | VARCHAR(255) | `string` | `string` | Hash da senha (ex: bcrypt). |
| **comissao** | DECIMAL(5,2) | `*float64` | `number` | Percentual de comissão (aplicável a Barbeiros, nulo para Clientes). |

---

## 🏆 2. Níveis (`Niveis`)
Configuração estática das faixas de experiência (patentes) e benefícios do sistema de gamificação RPG.

| Campo | Tipo SQL | Go Struct | React Field | Descrição |
|---|---|---|---|---|
| **id** (PK) | SERIAL | `int` | `number` | Identificador único do nível. |
| **nomedonivel** | VARCHAR(50) | `string` | `string` | Título da patente (ex: 'Barba de Respeito'). |
| **xpnecessario** | INT | `int` | `number` | XP necessário para atingir este nível. |
| **bonus** | VARCHAR(100) | `string` | `string` | Descrição do bônus/desconto liberado. |

---

## 📊 3. Progresso do Cliente (`ProgressoCliente`)
Controla o ganho de experiência em tempo real e a patente atual de cada Cliente no sistema RPG.

| Campo | Tipo SQL | Go Struct | React Field | Descrição |
|---|---|---|---|---|
| **id** (PK) | SERIAL | `int` | `number` | Identificador único do registro de progresso. |
| **clienteid** (FK) | INT | `int` | `number` | FK vinculada a `Usuarios.id` (ON DELETE CASCADE). |
| **xpatual** | INT | `int` | `number` | Total de pontos de experiência acumulados pelo cliente. |
| **nivelatual** (FK) | INT | `int` | `number` | FK vinculada a `Niveis.id`. |
| **barrapercentual**| DECIMAL(5,2) | `float64` | `number` | Percentual de progresso visual até o próximo nível. |
| **updatedat** | TIMESTAMP | `time.Time`| `string` | Timestamp da última atualização de progresso. |

---

## ✂️ 4. Serviços (`Servicos`)
Serviços e tratamentos oferecidos pela barbearia, bem como suas recompensas em XP.

| Campo | Tipo SQL | Go Struct | React Field | Descrição |
|---|---|---|---|---|
| **id** (PK) | SERIAL | `int` | `number` | Identificador único do serviço. |
| **nome** | VARCHAR(100) | `string` | `string` | Nome do serviço (ex: 'Corte + Barba'). |
| **preco** | DECIMAL(8,2) | `float64` | `number` | Preço cobrado em reais. |
| **xprecompensa** | INT | `int` | `number` | Quantidade de XP concedida ao cliente ao concluir. |
| **duracaominutos** | INT | `int` | `number` | Duração média em minutos. |

---

## 📅 5. Agendamentos (`Agendamentos`)
Gerencia o fluxo de horários e os atendimentos agendados entre Clientes, Barbeiros e Serviços.

| Campo | Tipo SQL | Go Struct | React Field | Descrição |
|---|---|---|---|---|
| **id** (PK) | SERIAL | `int` | `number` | Identificador único do agendamento. |
| **clienteid** (FK) | INT | `int` | `number` | FK para `Usuarios.id` (Cliente). |
| **barbeiroid** (FK) | INT | `int` | `number` | FK para `Usuarios.id` (Barbeiro). |
| **servicoid** (FK) | INT | `int` | `number` | FK para `Servicos.id` (Serviço). |
| **datahora** | TIMESTAMP | `time.Time`| `string` | Data e hora agendadas para o atendimento. |
| **status** | VARCHAR(20) | `string` | `string` | Estado do atendimento. Valores: `Pendente`, `Confirmado`, `Concluido`, `Cancelado`. |
| **criadoem** | TIMESTAMP | `time.Time`| `string` | Data de criação do registro de agendamento. |
