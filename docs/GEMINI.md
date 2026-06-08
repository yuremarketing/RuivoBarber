# ✂️ RuivoBarber — Setup MVP

> **⚠️ DIRETRIZES DO AGENTE (SYSTEM OVERRIDE):**
> 1. **EXCLUSIVIDADE:** Use APENAS as skills: `google-antigravity-sdk`, `modern-web-guidance`, `troubleshooting`.
> 2. **PROIBIÇÃO:** É ESTRITAMENTE PROIBIDO usar skills de bioinformática (`alphafold`, `pubmed`, `protein-*`) ou desenvolvimento mobile (`android-cli`, `xcode-project-setup`).
> 3. **CONTEXTO:** Se o arquivo `.antigravityrules` existir na raiz, siga suas instruções de limitação de taxa e escopo de leitura como prioridade absoluta.
> 4. **INFRAESTRUTURA:** Todas as chamadas de banco de dados e APIs externas devem passar pelo `RateLimiter` definido em `backend/internal/infra/ratelimiter.go`.
> Cole cada bloco no terminal na ordem indicada, ou salve o conteúdo de cada seção no caminho indicado.

---

## 0. Preparar diretório e estrutura de pastas

```bash
mkdir -p /home/mark/Dev/ruivobarber
cd /home/mark/Dev/ruivobarber

mkdir -p backend/cmd/api
mkdir -p backend/internal/core/domain
mkdir -p backend/internal/core/ports
mkdir -p backend/internal/core/services
mkdir -p backend/internal/adapters/handlers
mkdir -p backend/internal/adapters/repositories
mkdir -p frontend/src/components
mkdir -p frontend/src/pages
mkdir -p frontend/src/services
mkdir -p scripts
mkdir -p .github/workflows
```

---

## 1. Backend — `backend/go.mod`

```
module ruivobarber-api

go 1.21

require (
    github.com/gofiber/fiber/v2 v2.52.0
    github.com/lib/pq v1.10.9
    github.com/joho/godotenv v1.5.1
)
```

---

## 2. Backend — `backend/.env`

```
DB_HOST=db
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=secretpassword
DB_NAME=ruivobarber
PORT=8080
```

---

## 3. Backend — `backend/internal/core/domain/cliente.go`

```go
package domain

type Cliente struct {
    ID    int    `json:"id"`
    Nome  string `json:"nome"`
    Login string `json:"login"`
    Cargo string `json:"cargo"`
    XP    int    `json:"xp"`
    Nivel int    `json:"nivel"`
}
```

---

## 4. Backend — `backend/internal/core/ports/cliente_repository.go`

```go
package ports

import "ruivobarber-api/internal/core/domain"

type ClienteRepository interface {
    FindAll() ([]domain.Cliente, error)
    FindByID(id int) (*domain.Cliente, error)
    Save(c *domain.Cliente) error
}
```

---

## 5. Backend — `backend/internal/core/services/cliente_service.go`

```go
package services

import (
    "ruivobarber-api/internal/core/domain"
    "ruivobarber-api/internal/core/ports"
)

type ClienteService struct {
    repo ports.ClienteRepository
}

func NewClienteService(repo ports.ClienteRepository) *ClienteService {
    return &ClienteService{repo: repo}
}

func (s *ClienteService) ListarClientes() ([]domain.Cliente, error) {
    return s.repo.FindAll()
}

func (s *ClienteService) BuscarCliente(id int) (*domain.Cliente, error) {
    return s.repo.FindByID(id)
}
```

---

## 6. Backend — `backend/internal/adapters/repositories/cliente_pg_repository.go`

```go
package repositories

import (
    "database/sql"
    "ruivobarber-api/internal/core/domain"
)

type ClientePgRepository struct {
    db *sql.DB
}

func NewClientePgRepository(db *sql.DB) *ClientePgRepository {
    return &ClientePgRepository{db: db}
}

func (r *ClientePgRepository) FindAll() ([]domain.Cliente, error) {
    rows, err := r.db.Query("SELECT id, nome, login, cargo FROM Usuarios WHERE cargo = 'Cliente'")
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    var clientes []domain.Cliente
    for rows.Next() {
        var c domain.Cliente
        rows.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo)
        clientes = append(clientes, c)
    }
    return clientes, nil
}

func (r *ClientePgRepository) FindByID(id int) (*domain.Cliente, error) {
    var c domain.Cliente
    row := r.db.QueryRow("SELECT id, nome, login, cargo FROM Usuarios WHERE id = $1", id)
    err := row.Scan(&c.ID, &c.Nome, &c.Login, &c.Cargo)
    if err != nil {
        return nil, err
    }
    return &c, nil
}

func (r *ClientePgRepository) Save(c *domain.Cliente) error {
    _, err := r.db.Exec(
        "INSERT INTO Usuarios (nome, login, senha, cargo) VALUES ($1, $2, $3, $4)",
        c.Nome, c.Login, "hashed_senha", c.Cargo,
    )
    return err
}
```

---

## 7. Backend — `backend/internal/adapters/handlers/cliente_handler.go`

```go
package handlers

import (
    "strconv"
    "github.com/gofiber/fiber/v2"
    "ruivobarber-api/internal/core/services"
)

type ClienteHandler struct {
    service *services.ClienteService
}

func NewClienteHandler(service *services.ClienteService) *ClienteHandler {
    return &ClienteHandler{service: service}
}

func (h *ClienteHandler) RegisterRoutes(app *fiber.App) {
    api := app.Group("/api/v1")
    api.Get("/clientes", h.ListarClientes)
    api.Get("/clientes/:id", h.BuscarCliente)
    api.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{"status": "ok", "service": "RuivoBarber API"})
    })
}

func (h *ClienteHandler) ListarClientes(c *fiber.Ctx) error {
    clientes, err := h.service.ListarClientes()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(clientes)
}

func (h *ClienteHandler) BuscarCliente(c *fiber.Ctx) error {
    id, err := strconv.Atoi(c.Params("id"))
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "ID inválido"})
    }
    cliente, err := h.service.BuscarCliente(id)
    if err != nil {
        return c.Status(404).JSON(fiber.Map{"error": "Cliente não encontrado"})
    }
    return c.JSON(cliente)
}
```

---

## 8. Backend — `backend/cmd/api/main.go`

```go
package main

import (
    "database/sql"
    "fmt"
    "log"
    "os"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/joho/godotenv"
    _ "github.com/lib/pq"

    "ruivobarber-api/internal/adapters/handlers"
    "ruivobarber-api/internal/adapters/repositories"
    "ruivobarber-api/internal/core/services"
)

func main() {
    if err := godotenv.Load(); err != nil {
        log.Println("Ficheiro .env não encontrado, a usar variáveis do sistema")
    }

    dsn := fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        os.Getenv("DB_HOST"), os.Getenv("DB_PORT"),
        os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"),
        os.Getenv("DB_NAME"),
    )
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        log.Fatalf("Erro ao conectar ao banco: %v", err)
    }
    defer db.Close()

    if err := db.Ping(); err != nil {
        log.Fatalf("Banco inacessível: %v", err)
    }
    log.Println("✅ Conectado ao PostgreSQL com sucesso")

    clienteRepo := repositories.NewClientePgRepository(db)
    clienteService := services.NewClienteService(clienteRepo)
    clienteHandler := handlers.NewClienteHandler(clienteService)

    app := fiber.New(fiber.Config{AppName: "RuivoBarber API v1.0"})
    app.Use(logger.New())
    app.Use(cors.New())

    clienteHandler.RegisterRoutes(app)

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("🚀 RuivoBarber API a correr na porta %s", port)
    log.Fatal(app.Listen(":" + port))
}
```

---

## 9. Backend — `backend/Dockerfile`

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main ./cmd/api/main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
COPY --from=builder /app/.env .
EXPOSE 8080
CMD ["./main"]
```

---

## 10. Frontend — `frontend/package.json`

```json
{
  "name": "ruivobarber-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "vite --host 0.0.0.0 --port 3000",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

---

## 11. Frontend — `frontend/vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:8080',
        changeOrigin: true
      }
    }
  }
})
```

---

## 12. Frontend — `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RuivoBarber</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## 13. Frontend — `frontend/src/main.jsx`

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

## 14. Frontend — `frontend/src/App.jsx`

```jsx
import React from 'react'
import PlayerCard from './components/PlayerCard.jsx'
import RpgProgressBar from './components/RpgProgressBar.jsx'

function App() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '2rem', background: '#1a1a2e', minHeight: '100vh', color: '#eee' }}>
      <h1 style={{ color: '#e94560' }}>✂️ RuivoBarber</h1>
      <PlayerCard nome="João Silva" nivel="Barba de Respeito" xp={320} />
      <RpgProgressBar xpAtual={320} xpProximo={600} />
    </div>
  )
}

export default App
```

---

## 15. Frontend — `frontend/src/services/api.js`

```js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1'
})

export const listarClientes = () => api.get('/clientes')
export const buscarCliente = (id) => api.get(`/clientes/${id}`)

export default api
```

---

## 16. Frontend — `frontend/src/components/PlayerCard.jsx`

```jsx
import React from 'react'

function PlayerCard({ nome, nivel, xp }) {
  return (
    <div style={{
      background: '#16213e',
      border: '2px solid #e94560',
      borderRadius: '12px',
      padding: '1.5rem',
      maxWidth: '400px',
      marginBottom: '1rem'
    }}>
      <h2 style={{ margin: 0, color: '#e94560' }}>👤 {nome}</h2>
      <p style={{ margin: '0.5rem 0', color: '#a8a8b3' }}>Nível: <strong style={{ color: '#fff' }}>{nivel}</strong></p>
      <p style={{ margin: 0, color: '#a8a8b3' }}>XP Total: <strong style={{ color: '#f5a623' }}>{xp} XP</strong></p>
    </div>
  )
}

export default PlayerCard
```

---

## 17. Frontend — `frontend/src/components/RpgProgressBar.jsx`

```jsx
import React from 'react'

function RpgProgressBar({ xpAtual, xpProximo }) {
  const percentual = Math.min((xpAtual / xpProximo) * 100, 100).toFixed(1)

  return (
    <div style={{ maxWidth: '400px', marginBottom: '1rem' }}>
      <p style={{ margin: '0 0 0.3rem', color: '#a8a8b3', fontSize: '0.85rem' }}>
        Progresso para próximo nível: {xpAtual} / {xpProximo} XP ({percentual}%)
      </p>
      <div style={{ background: '#0f3460', borderRadius: '8px', height: '18px', overflow: 'hidden', border: '1px solid #e94560' }}>
        <div style={{
          width: `${percentual}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #e94560, #f5a623)',
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  )
}

export default RpgProgressBar
```

---

## 18. Frontend — `frontend/src/components/RedeemCouponManager.jsx`

```jsx
import React, { useState } from 'react'

function RedeemCouponManager({ clienteId }) {
  const [codigo, setCodigo] = useState('')
  const [mensagem, setMensagem] = useState(null)

  const resgatar = async () => {
    // TODO: chamar endpoint POST /api/v1/cupons/resgatar
    setMensagem(`Cupom "${codigo}" enviado para validação!`)
    setCodigo('')
  }

  return (
    <div style={{ maxWidth: '400px', background: '#16213e', padding: '1rem', borderRadius: '10px', border: '1px solid #0f3460' }}>
      <h3 style={{ color: '#f5a623', marginTop: 0 }}>🎟️ Resgatar Cupom</h3>
      <input
        type="text"
        value={codigo}
        onChange={e => setCodigo(e.target.value)}
        placeholder="Código do cupom"
        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e94560', background: '#1a1a2e', color: '#fff', marginBottom: '0.5rem', boxSizing: 'border-box' }}
      />
      <button onClick={resgatar} style={{ background: '#e94560', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
        Resgatar
      </button>
      {mensagem && <p style={{ color: '#4caf50', marginTop: '0.5rem' }}>{mensagem}</p>}
    </div>
  )
}

export default RedeemCouponManager
```

---

## 19. Frontend — `frontend/src/components/AdminValidationPanel.jsx`

```jsx
import React, { useEffect, useState } from 'react'
import { listarClientes } from '../services/api.js'

function AdminValidationPanel() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listarClientes()
      .then(res => setClientes(res.data || []))
      .catch(() => setClientes([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: '600px', background: '#16213e', padding: '1rem', borderRadius: '10px', border: '1px solid #0f3460' }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>🛡️ Painel Admin — Clientes</h3>
      {loading ? (
        <p style={{ color: '#a8a8b3' }}>A carregar...</p>
      ) : clientes.length === 0 ? (
        <p style={{ color: '#a8a8b3' }}>Nenhum cliente encontrado.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#eee' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e94560' }}>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>Login</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #0f3460' }}>
                <td style={{ padding: '0.4rem' }}>{c.id}</td>
                <td style={{ padding: '0.4rem' }}>{c.nome}</td>
                <td style={{ padding: '0.4rem' }}>{c.login}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default AdminValidationPanel
```

---

## 20. Frontend — `frontend/Dockerfile`

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

---

## 21. Banco de Dados — `scripts/init.sql`

```sql
-- ============================================================
-- Estrutura Inicial: RuivoBarber MVP
-- ============================================================

CREATE TABLE Usuarios (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Cargo VARCHAR(20) CHECK (Cargo IN ('Adm', 'Barbeiro', 'Cliente')),
    Login VARCHAR(50) UNIQUE NOT NULL,
    Senha VARCHAR(255) NOT NULL,
    Comissao DECIMAL(5,2)
);

CREATE TABLE Niveis (
    ID SERIAL PRIMARY KEY,
    NomeDoNivel VARCHAR(50) NOT NULL,
    XpNecessario INT NOT NULL,
    Bonus VARCHAR(100)
);

INSERT INTO Niveis (NomeDoNivel, XpNecessario, Bonus) VALUES
('Corte Iniciante', 100, '-'),
('Barba de Respeito', 300, '5% de desconto'),
('Lenda da Navalha', 600, '10% de desconto'),
('Rei da Cadeira', 1000, '1 Corte Grátis');

CREATE TABLE ProgressoCliente (
    ID SERIAL PRIMARY KEY,
    ClienteID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
    XPAtual INT DEFAULT 0,
    NivelAtual INT DEFAULT 1 REFERENCES Niveis(ID),
    BarraPercentual DECIMAL(5,2) DEFAULT 0.00,
    UpdatedAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE Servicos (
    ID SERIAL PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Preco DECIMAL(8,2) NOT NULL,
    XpRecompensa INT NOT NULL DEFAULT 10,
    DuracaoMinutos INT DEFAULT 30
);

INSERT INTO Servicos (Nome, Preco, XpRecompensa, DuracaoMinutos) VALUES
('Corte Simples', 35.00, 10, 30),
('Corte + Barba', 60.00, 25, 60),
('Barba Completa', 40.00, 15, 45),
('Hidratação Capilar', 50.00, 20, 40);

CREATE TABLE Agendamentos (
    ID SERIAL PRIMARY KEY,
    ClienteID INT REFERENCES Usuarios(ID),
    BarbeiroID INT REFERENCES Usuarios(ID),
    ServicoID INT REFERENCES Servicos(ID),
    DataHora TIMESTAMP NOT NULL,
    Status VARCHAR(20) DEFAULT 'Pendente' CHECK (Status IN ('Pendente', 'Confirmado', 'Concluido', 'Cancelado')),
    CriadoEm TIMESTAMP DEFAULT NOW()
);

CREATE TABLE Cupons (
    ID SERIAL PRIMARY KEY,
    Codigo VARCHAR(50) UNIQUE NOT NULL,
    Descricao VARCHAR(150),
    DescontoPercent DECIMAL(5,2),
    ClienteID INT REFERENCES Usuarios(ID),
    Usado BOOLEAN DEFAULT FALSE,
    ValidoAte DATE
);

CREATE TABLE Configuracoes (
    ID SERIAL PRIMARY KEY,
    ChaveAPIWhatsApp VARCHAR(255),
    UrlWebhook VARCHAR(255)
);

-- Utilizador admin inicial (trocar senha em produção)
INSERT INTO Usuarios (Nome, Cargo, Login, Senha) VALUES
('Administrador', 'Adm', 'admin', '$2a$10$placeholder_hash_trocar');
```

---

## 22. Orquestração — `docker-compose.yml`

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: ruivobarber-db
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: ruivobarber
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d ruivobarber"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    container_name: ruivobarber-backend
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DB_HOST=db
      - DB_PORT=5432
      - DB_USER=admin
      - DB_PASSWORD=secretpassword
      - DB_NAME=ruivobarber
      - PORT=8080
    restart: unless-stopped

  frontend:
    build: ./frontend
    container_name: ruivobarber-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  db_data:
```

---

## 23. CI/CD — `.github/workflows/deploy.yml`

```yaml
name: Deploy RuivoBarber to Cloud Run

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Log in to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_CREDENTIALS }}

      - name: Configure Docker for Google Artifact Registry
        run: gcloud auth configure-docker

      - name: Build and Push Backend
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT }}/ruivobarber-backend ./backend
          docker push gcr.io/${{ secrets.GCP_PROJECT }}/ruivobarber-backend

      - name: Build and Push Frontend
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT }}/ruivobarber-frontend ./frontend
          docker push gcr.io/${{ secrets.GCP_PROJECT }}/ruivobarber-frontend

      - name: Deploy Backend to Cloud Run
        run: |
          gcloud run deploy ruivobarber-backend \
            --image gcr.io/${{ secrets.GCP_PROJECT }}/ruivobarber-backend \
            --region us-central1 \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars DB_HOST=${{ secrets.DB_HOST }},DB_USER=${{ secrets.DB_USER }},DB_PASSWORD=${{ secrets.DB_PASSWORD }},DB_NAME=ruivobarber

      - name: Deploy Frontend to Cloud Run
        run: |
          gcloud run deploy ruivobarber-frontend \
            --image gcr.io/${{ secrets.GCP_PROJECT }}/ruivobarber-frontend \
            --region us-central1 \
            --platform managed \
            --allow-unauthenticated
```

---

## 24. Para subir tudo

```bash
cd /home/mark/Dev/ruivobarber
docker-compose up --build
```

| Serviço    | URL |
|------------|-----|
| Frontend   | http://localhost:3000 |
| API Health | http://localhost:8080/api/v1/health |
| Clientes   | http://localhost:8080/api/v1/clientes |
| PostgreSQL | localhost:5432 |

## 🛡️ Protocolo de Compliance de Código
Antes de sugerir qualquer alteração de código ou refatoração:
1. **EditorConfig**: Valide se a formatação está em conformidade com o .editorconfig do projeto.
2. **Ignorados**: Nunca referencie arquivos listados no .dockerignore (node_modules, dist, backend/main) no contexto de build.
3. **Padrão Go**: Verifique se o código segue a arquitetura de Ports and Adapters antes de finalizar a sugestão.

## 🛡️ Protocolo de Compliance de Código
Antes de sugerir qualquer alteração de código ou refatoração:
1. **EditorConfig**: Valide se a formatação está em conformidade com o .editorconfig do projeto.
2. **Ignorados**: Nunca referencie arquivos listados no .dockerignore (node_modules, dist, backend/main) no contexto de build.
3. **Padrão Go**: Verifique se o código segue a arquitetura de Ports and Adapters antes de finalizar a sugestão.
