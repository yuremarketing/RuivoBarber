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
