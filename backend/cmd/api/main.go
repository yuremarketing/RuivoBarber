package main

import (
	"database/sql"
	"embed"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"golang.org/x/crypto/bcrypt"
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

    // Atualizar senha do admin se for o placeholder ou plain-text legado para permitir login seguro com bcrypt
    var adminCount int
    err = db.QueryRow("SELECT COUNT(*) FROM Usuarios WHERE Login = 'admin'").Scan(&adminCount)
    if err == nil && adminCount > 0 {
        var currentSenha string
        err = db.QueryRow("SELECT Senha FROM Usuarios WHERE Login = 'admin'").Scan(&currentSenha)
        if err == nil && (currentSenha == "$2a$10$placeholder_hash_trocar" || currentSenha == "admin" || !strings.HasPrefix(currentSenha, "$2a$")) {
            log.Println("🔑 Atualizando senha do admin para hash bcrypt seguro...")
            hashedBytes, err := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
            if err == nil {
                _, err = db.Exec("UPDATE Usuarios SET Senha = $1 WHERE Login = 'admin'", string(hashedBytes))
                if err != nil {
                    log.Printf("[SEED] Erro ao atualizar senha do admin: %v", err)
                }
            }
        }
    }

    // Criar cliente de demonstração se não existir com senha criptografada
    var clientCount int
    err = db.QueryRow("SELECT COUNT(*) FROM Usuarios WHERE Login = 'cliente'").Scan(&clientCount)
    if err == nil && clientCount == 0 {
        log.Println("🌱 Semeando cliente de demonstração com senha segura...")
        hashedBytes, err := bcrypt.GenerateFromPassword([]byte("cliente"), bcrypt.DefaultCost)
        if err == nil {
            _, err = db.Exec("INSERT INTO Usuarios (Nome, Cargo, Login, Senha) VALUES ($1, $2, $3, $4)", "Cliente Demo", "Cliente", "cliente", string(hashedBytes))
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
    }

    // Semeando as três novas contas fictícias da Task 34
    // 1. Administrador Fictício
    var fAdminCount int
    err = db.QueryRow("SELECT COUNT(*) FROM Usuarios WHERE Login = 'admin_ruivo'").Scan(&fAdminCount)
    if err == nil && fAdminCount == 0 {
        log.Println("🌱 Semeando Administrador Fictício...")
        hashedBytes, err := bcrypt.GenerateFromPassword([]byte("RuivoAdmin123!"), bcrypt.DefaultCost)
        if err == nil {
            _, err = db.Exec("INSERT INTO Usuarios (Nome, Cargo, Login, Senha) VALUES ($1, $2, $3, $4)", "Administrador Fictício", "Adm", "admin_ruivo", string(hashedBytes))
            if err != nil {
                log.Printf("[SEED] Erro ao semear Administrador Fictício: %v", err)
            }
        }
    }

    // 2. Barbeiro Fictício
    var fBarberCount int
    err = db.QueryRow("SELECT COUNT(*) FROM Usuarios WHERE Login = 'barbeiro_ruivo'").Scan(&fBarberCount)
    if err == nil && fBarberCount == 0 {
        log.Println("🌱 Semeando Barbeiro Fictício...")
        hashedBytes, err := bcrypt.GenerateFromPassword([]byte("RuivoBarbeiro123!"), bcrypt.DefaultCost)
        if err == nil {
            _, err = db.Exec("INSERT INTO Usuarios (Nome, Cargo, Login, Senha) VALUES ($1, $2, $3, $4)", "Barbeiro Fictício", "Barbeiro", "barbeiro_ruivo", string(hashedBytes))
            if err != nil {
                log.Printf("[SEED] Erro ao semear Barbeiro Fictício: %v", err)
            }
        }
    }

    // 3. Cliente Fictício
    var fClientCount int
    err = db.QueryRow("SELECT COUNT(*) FROM Usuarios WHERE Login = 'cliente_ruivo'").Scan(&fClientCount)
    if err == nil && fClientCount == 0 {
        log.Println("🌱 Semeando Cliente Fictício...")
        hashedBytes, err := bcrypt.GenerateFromPassword([]byte("RuivoCliente123!"), bcrypt.DefaultCost)
        if err == nil {
            _, err = db.Exec("INSERT INTO Usuarios (Nome, Cargo, Login, Senha) VALUES ($1, $2, $3, $4)", "Cliente Fictício", "Cliente", "cliente_ruivo", string(hashedBytes))
            if err != nil {
                log.Printf("[SEED] Erro ao semear Cliente Fictício: %v", err)
            } else {
                var cID int
                err = db.QueryRow("SELECT ID FROM Usuarios WHERE Login = 'cliente_ruivo'").Scan(&cID)
                if err == nil {
                    _, err = db.Exec("INSERT INTO ProgressoCliente (ClienteID, XPAtual, NivelAtual, BarraPercentual) VALUES ($1, $2, $3, $4)", cID, 150, 2, 50.0)
                    if err != nil {
                        log.Printf("[SEED] Erro ao criar progresso para Cliente Fictício: %v", err)
                    }
                }
            }
        }
    }

    // Semeando alguns agendamentos de teste (Mocks) para o Barbeiro Fictício se não houver nenhum agendamento cadastrado
    var agCount int
    err = db.QueryRow("SELECT COUNT(*) FROM Agendamentos").Scan(&agCount)
    if err == nil && agCount == 0 {
        log.Println("🌱 Semeando agendamentos de teste (mocks) para o Barbeiro Fictício...")
        var bID, cID int
        errB := db.QueryRow("SELECT ID FROM Usuarios WHERE Login = 'barbeiro_ruivo'").Scan(&bID)
        errC := db.QueryRow("SELECT ID FROM Usuarios WHERE Login = 'cliente_ruivo'").Scan(&cID)
        if errB == nil && errC == nil {
            // Seed a few appointments for 2026-06-18, 2026-06-19, and 2026-06-20
            dates := []string{
                "2026-06-18 10:00:00", // 10:00 - 10:30 (Corte Simples)
                "2026-06-18 14:00:00", // 14:00 - 15:00 (Corte + Barba)
                "2026-06-19 11:30:00", // 11:30 - 12:00
                "2026-06-19 16:00:00", // 16:00 - 17:00
                "2026-06-20 09:30:00", // 09:30 - 10:30
                "2026-06-20 15:00:00", // 15:00 - 15:30
            }
            
            // Servicos: 1 (Corte Simples - 30m), 2 (Corte + Barba - 60m)
            servIds := []int{1, 2, 1, 2, 2, 1}
            
            // Utilizando o time package para fazer parse dos horários locais
            for i, dStr := range dates {
                pTime, parseErr := time.ParseInLocation("2006-01-02 15:04:05", dStr, time.Local)
                if parseErr == nil {
                    _, err = db.Exec("INSERT INTO Agendamentos (ClienteID, BarbeiroID, ServicoID, DataHora, Status) VALUES ($1, $2, $3, $4, 'Confirmado')", cID, bID, servIds[i], pTime)
                    if err != nil {
                        log.Printf("[SEED] Erro ao semear agendamento de teste: %v", err)
                    }
                } else {
                    log.Printf("[SEED] Erro de parse de data mock: %v", parseErr)
                }
            }
        }
    }

    notificationService := services.NewNotificationService()
    notificationService.StartWorker()

    clienteRepo := repositories.NewClientePgRepository(db)
    temporadaRepo := repositories.NewTemporadaPgRepository(db)
    clienteService := services.NewClienteService(clienteRepo, notificationService, temporadaRepo)
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
