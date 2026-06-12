package main

import (
	"database/sql"
	"embed"
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

//go:embed schema.sql
var schemaFS embed.FS

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Ficheiro .env não encontrado, a usar variáveis do sistema")
	}

	sslMode := os.Getenv("DB_SSLMODE")
	if sslMode == "" {
		sslMode = "disable"
	}
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"), sslMode,
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

	// Verificar se a tabela Usuarios existe, se não, inicializar o banco
	var tableExists bool
	err = db.QueryRow("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usuarios')").Scan(&tableExists)
	if err != nil {
		log.Printf("[DB] Erro ao verificar tabelas: %v", err)
	}

	if !tableExists {
		log.Println("⚙️ Banco de dados vazio detectado. Inicializando tabelas (schema.sql)...")
		schemaBytes, err := schemaFS.ReadFile("schema.sql")
		if err != nil {
			log.Fatalf("❌ Falha ao ler schema.sql embutido: %v", err)
		}
		_, err = db.Exec(string(schemaBytes))
		if err != nil {
			log.Fatalf("❌ Falha crítica ao inicializar o banco de dados: %v", err)
		}
		log.Println("✅ Banco de dados inicializado com sucesso!")
	}

    // Atualizar senha do admin se for o placeholder para permitir login
    _, err = db.Exec("UPDATE Usuarios SET Senha = 'admin' WHERE Login = 'admin' AND Senha = '$2a$10$placeholder_hash_trocar'")
    if err != nil {
        log.Printf("[SEED] Erro ao atualizar senha do admin: %v", err)
    }

    // Criar cliente de demonstração se não existir
    var clientCount int
    err = db.QueryRow("SELECT COUNT(*) FROM Usuarios WHERE Login = 'cliente'").Scan(&clientCount)
    if err == nil && clientCount == 0 {
        log.Println("🌱 Semeando cliente de demonstração...")
        _, err = db.Exec("INSERT INTO Usuarios (Nome, Cargo, Login, Senha) VALUES ($1, $2, $3, $4)", "Cliente Demo", "Cliente", "cliente", "cliente")
        if err != nil {
            log.Printf("[SEED] Erro ao semear cliente: %v", err)
        }
        
        var clienteID int
        err = db.QueryRow("SELECT ID FROM Usuarios WHERE Login = 'cliente'").Scan(&clienteID)
        if err == nil {
            _, err = db.Exec("INSERT INTO ProgressoCliente (ClienteID, XPAtual, NivelAtual, BarraPercentual) VALUES ($1, $2, $3, $4)", clienteID, 120, 2, 40.0)
            if err != nil {
                log.Printf("[SEED] Erro ao criar progresso para cliente: %v", err)
            }
        }
    }

    notificationService := services.NewNotificationService()
    notificationService.StartWorker()

    clienteRepo := repositories.NewClientePgRepository(db)
    clienteService := services.NewClienteService(clienteRepo, notificationService)
    clienteHandler := handlers.NewClienteHandler(clienteService)

    app := fiber.New(fiber.Config{AppName: "RuivoBarber API v1.0"})
    app.Use(logger.New())
    app.Use(cors.New())
    app.Use(func(c *fiber.Ctx) error {
        err := c.Next()
        status := c.Response().StatusCode()
        if status == 400 || status == 500 {
            log.Printf("[DEBUG LOG] Status %d - Request Body: %s", status, string(c.Body()))
        }
        return err
    })

    clienteHandler.RegisterRoutes(app)

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("🚀 RuivoBarber API a correr na porta %s", port)
    log.Fatal(app.Listen(":" + port))
}
