package main

import (
	"context"
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

	// Migração automática: Garantir coluna avatar_url na tabela Usuarios
	_, err = db.Exec("ALTER TABLE Usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''")
	if err != nil {
		log.Printf("[DB] Erro ao executar migração automática (avatar_url): %v", err)
	} else {
		log.Println("✅ Migração automática: coluna avatar_url garantida na tabela Usuarios")
	}

	// Migração automática para Clãs
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS Clas (
			ID SERIAL PRIMARY KEY,
			Nome VARCHAR(100) UNIQUE NOT NULL,
			Descricao VARCHAR(255),
			XPColetivo INT DEFAULT 0,
			NivelAtual INT DEFAULT 1,
			LiderID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
			CriadoEm TIMESTAMP DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_clas_lider ON Clas(LiderID);

		CREATE TABLE IF NOT EXISTS ClaMembros (
			UsuarioID INT PRIMARY KEY REFERENCES Usuarios(ID) ON DELETE CASCADE,
			ClaID INT NOT NULL REFERENCES Clas(ID) ON DELETE CASCADE,
			Cargo VARCHAR(20) DEFAULT 'Membro' CHECK (Cargo IN ('Lider', 'ViceLider', 'Membro')),
			DataEntrada TIMESTAMP DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_cla_membros_cla ON ClaMembros(ClaID);

		CREATE TABLE IF NOT EXISTS ClaConvites (
			ID SERIAL PRIMARY KEY,
			ClaID INT NOT NULL REFERENCES Clas(ID) ON DELETE CASCADE,
			ConvidadoID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
			EnviadoPor INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
			Status VARCHAR(20) DEFAULT 'Pendente' CHECK (Status IN ('Pendente', 'Aceito', 'Recusado')),
			CriadoEm TIMESTAMP DEFAULT NOW(),
			UNIQUE(ClaID, ConvidadoID)
		);
	`)
	if err != nil {
		log.Printf("[DB] Erro ao executar migração automática para Clãs: %v", err)
	} else {
		log.Println("✅ Migração automática: tabelas de Clãs (Clas, ClaMembros, ClaConvites) garantidas no banco")
	}

	// Migração automática para Badges
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS Badges (
			ID SERIAL PRIMARY KEY,
			Nome VARCHAR(100) UNIQUE NOT NULL,
			Descricao VARCHAR(255) NOT NULL,
			IconeURL VARCHAR(255) DEFAULT '',
			RequisitoTipo VARCHAR(50) NOT NULL,
			RequisitoValor INT NOT NULL,
			XpBonus INT DEFAULT 50,
			CriadoEm TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS UsuarioBadges (
			UsuarioID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
			BadgeID INT NOT NULL REFERENCES Badges(ID) ON DELETE CASCADE,
			DesbloqueadoEm TIMESTAMP DEFAULT NOW(),
			PRIMARY KEY (UsuarioID, BadgeID)
		);
	`)
	if err != nil {
		log.Printf("[DB] Erro ao executar migração automática para Badges: %v", err)
	} else {
		// Executar seed inicial de Badges
		_, err = db.Exec(`
			INSERT INTO Badges (Nome, Descricao, RequisitoTipo, RequisitoValor, XpBonus) VALUES
			('Primeiro Sangue', 'Concluiu o primeiro atendimento na barbearia', 'Cortes', 1, 50),
			('Fiel da Navalha', 'Concluiu 5 atendimentos na barbearia', 'Cortes', 5, 50),
			('Barba de Respeito', 'Alcançou o nível 2 de progresso', 'Nivel', 2, 50),
			('Lenda Viva', 'Alcançou o nível 3 de progresso (patente máxima)', 'Nivel', 3, 50)
			ON CONFLICT (Nome) DO NOTHING;
		`)
		if err != nil {
			log.Printf("[DB] Erro ao executar seed inicial de Badges: %v", err)
		} else {
			log.Println("✅ Migração automática: tabelas de Badges e sementes iniciais garantidas no banco")
		}
	}

	// Migração automática para Loja (Store)
	_, err = db.Exec(`
		ALTER TABLE ProgressoCliente ADD COLUMN IF NOT EXISTS Moedas INT DEFAULT 0;

		CREATE TABLE IF NOT EXISTS ItensLoja (
			ID SERIAL PRIMARY KEY,
			Nome VARCHAR(100) UNIQUE NOT NULL,
			Descricao VARCHAR(255) NOT NULL,
			Preco INT NOT NULL,
			TipoItem VARCHAR(50) NOT NULL,
			StyleClass VARCHAR(100) NOT NULL,
			CriadoEm TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS UsuarioItens (
			UsuarioID INT NOT NULL REFERENCES Usuarios(ID) ON DELETE CASCADE,
			ItemID INT NOT NULL REFERENCES ItensLoja(ID) ON DELETE CASCADE,
			CompradoEm TIMESTAMP DEFAULT NOW(),
			Equipado BOOLEAN DEFAULT FALSE,
			PRIMARY KEY (UsuarioID, ItemID)
		);
	`)
	if err != nil {
		log.Printf("[DB] Erro ao executar migração automática para Loja: %v", err)
	} else {
		// Seed de Itens iniciais
		_, err = db.Exec(`
			INSERT INTO ItensLoja (Nome, Descricao, Preco, TipoItem, StyleClass) VALUES
			('Moldura de Ouro', 'Moldura dourada premium para o seu Card de Jogador', 200, 'Moldura', 'frame-gold'),
			('Fundo Neon de Fogo', 'Fundo animado de chamas neon para o seu Card', 350, 'Background', 'bg-neon-fire'),
			('Fundo Neon de Gelo', 'Fundo animado de cristais de gelo neon para o seu Card', 350, 'Background', 'bg-neon-ice'),
			('Efeito Sombra Pulsante', 'Efeito de brilho neon pulsante ao redor do seu Card', 500, 'Efeito', 'glow-pulsing')
			ON CONFLICT (Nome) DO NOTHING;
		`)
		if err != nil {
			log.Printf("[DB] Erro ao executar seed inicial de itens da loja: %v", err)
		} else {
			log.Println("✅ Migração automática: tabelas de Loja e itens iniciais garantidos no banco")
		}
	}

	// Migração automática para Missões Semanais (Quests)
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS ClaMissoes (
			ID SERIAL PRIMARY KEY,
			Descricao VARCHAR(255) UNIQUE NOT NULL,
			Meta INT NOT NULL,
			TipoRequisito VARCHAR(50) NOT NULL,
			XpBonus INT NOT NULL,
			CriadoEm TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS ClaMissoesSemanais (
			SemanaAno VARCHAR(10) NOT NULL,
			MissaoID INT NOT NULL REFERENCES ClaMissoes(ID) ON DELETE CASCADE,
			PRIMARY KEY (SemanaAno, MissaoID)
		);

		CREATE TABLE IF NOT EXISTS ClaMissoesProgresso (
			ClaID INT NOT NULL REFERENCES Clas(ID) ON DELETE CASCADE,
			MissaoID INT NOT NULL REFERENCES ClaMissoes(ID) ON DELETE CASCADE,
			SemanaAno VARCHAR(10) NOT NULL,
			Progresso INT DEFAULT 0,
			Completada BOOLEAN DEFAULT FALSE,
			CompletadaEm TIMESTAMP,
			PRIMARY KEY (ClaID, MissaoID, SemanaAno)
		);
	`)
	if err != nil {
		log.Printf("[DB] Erro ao executar migração automática para Missões Semanais: %v", err)
	} else {
		// Seed de Missões iniciais
		_, err = db.Exec(`
			INSERT INTO ClaMissoes (Descricao, Meta, TipoRequisito, XpBonus) VALUES
			('Navalha de Elite: Realizar 10 atendimentos', 10, 'Atendimentos', 100),
			('Esquadrão do Cabelo: Concluir 5 cortes', 5, 'Cortes', 80),
			('Barba Suprema: Fazer 5 barbas', 5, 'Barbas', 80),
			('Força Coletiva: Acumular 15 XP de Clã', 15, 'XpClã', 150)
			ON CONFLICT (Descricao) DO NOTHING;
		`)
		if err != nil {
			log.Printf("[DB] Erro ao executar seed inicial de Missões Semanais: %v", err)
		} else {
			log.Println("✅ Migração automática: tabelas de Missões e sementes iniciais garantidas no banco")
		}
	}

	// Migração automática para Loyalty (Check-In)
	_, err = db.Exec(`
		ALTER TABLE ProgressoCliente ADD COLUMN IF NOT EXISTS StreakAtual INT DEFAULT 0;
		ALTER TABLE ProgressoCliente ADD COLUMN IF NOT EXISTS UltimoCheckIn TIMESTAMP;
	`)
	if err != nil {
		log.Printf("[DB] Erro ao executar migração automática para Loyalty: %v", err)
	} else {
		log.Println("✅ Migração automática: colunas de Loyalty (StreakAtual, UltimoCheckIn) garantidas no banco")
	}

	// Migração automática para Raids
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS Raids (
			ID SERIAL PRIMARY KEY,
			Nome VARCHAR(100) UNIQUE NOT NULL,
			Descricao VARCHAR(255) NOT NULL,
			Meta INT NOT NULL,
			Progresso INT DEFAULT 0,
			TipoRequisito VARCHAR(50) NOT NULL,
			RecompensaXp INT DEFAULT 50,
			RecompensaMoedas INT DEFAULT 50,
			DataInicio TIMESTAMP NOT NULL,
			DataFim TIMESTAMP NOT NULL,
			Status VARCHAR(20) DEFAULT 'Ativo' CHECK (Status IN ('Ativo', 'Concluido', 'Expirado')),
			CriadoEm TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS RaidContribuicoes (
			RaidID INT REFERENCES Raids(ID) ON DELETE CASCADE,
			UsuarioID INT REFERENCES Usuarios(ID) ON DELETE CASCADE,
			Contribuicao INT DEFAULT 0,
			RecompensaResgatada BOOLEAN DEFAULT FALSE,
			PRIMARY KEY (RaidID, UsuarioID)
		);
	`)
	if err != nil {
		log.Printf("[DB] Erro ao executar migração automática para Raids: %v", err)
	} else {
		log.Println("✅ Migração automática: tabelas de Raids (Raids, RaidContribuicoes) garantidas no banco")
	}

	// Migração automática para Queue (Fila & Tempo Médio)
	_, err = db.Exec(`
		ALTER TABLE Agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;
		ALTER TABLE Agendamentos ADD CONSTRAINT agendamentos_status_check CHECK (Status IN ('Pendente', 'Confirmado', 'Concluido', 'Cancelado', 'Falta', 'Presente', 'EmCadeira'));

		ALTER TABLE Agendamentos ADD COLUMN IF NOT EXISTS CheckInTime TIMESTAMP;
		ALTER TABLE Agendamentos ADD COLUMN IF NOT EXISTS EmCadeiraTime TIMESTAMP;
		ALTER TABLE Agendamentos ADD COLUMN IF NOT EXISTS ConcluidoTime TIMESTAMP;
	`)
	if err != nil {
		log.Printf("[DB] Erro ao executar migração automática para Queue: %v", err)
	} else {
		log.Println("✅ Migração automática: colunas e constraints de Queue (Fila) garantidas no banco")
	}

	// Migração automática para Lives
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS Lives (
			ID SERIAL PRIMARY KEY,
			Titulo VARCHAR(150) NOT NULL,
			Url TEXT NOT NULL,
			Plataforma VARCHAR(50) NOT NULL,
			Ativa BOOLEAN DEFAULT FALSE,
			CriadoEm TIMESTAMP DEFAULT NOW()
		);
	`)
	if err != nil {
		log.Printf("[DB] Erro ao executar migração automática para Lives: %v", err)
	} else {
		log.Println("✅ Migração automática: tabela de Lives garantida no banco")
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

    claRepo := repositories.NewClaPgRepository(db)
    claService := services.NewClaService(claRepo)
    claHandler := handlers.NewClaHandler(claService)

    badgeRepo := repositories.NewBadgePgRepository(db)
    badgeService := services.NewBadgeService(badgeRepo)
    badgeHandler := handlers.NewBadgeHandler(badgeService)

    storeRepo := repositories.NewStorePgRepository(db)
    storeService := services.NewStoreService(storeRepo)
    storeHandler := handlers.NewStoreHandler(storeService)

    questRepo := repositories.NewQuestPgRepository(db)
    questService := services.NewQuestService(questRepo, db)
    questService.StartWeeklyQuestsWorker(context.Background())
    questHandler := handlers.NewQuestHandler(questService)

    loyaltyRepo := repositories.NewLoyaltyPgRepository(db)
    loyaltyService := services.NewLoyaltyService(loyaltyRepo)
    loyaltyHandler := handlers.NewLoyaltyHandler(loyaltyService)

    raidRepo := repositories.NewRaidPgRepository(db)
    raidService := services.NewRaidService(raidRepo)
    raidHandler := handlers.NewRaidHandler(raidService)

    queueRepo := repositories.NewQueuePgRepository(db)
    queueService := services.NewQueueService(queueRepo)
    queueHandler := handlers.NewQueueHandler(queueService)

    liveRepo := repositories.NewLivePgRepository(db)
    liveService := services.NewLiveService(liveRepo)
    liveHandler := handlers.NewLiveHandler(liveService)

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

    questHandler.RegisterRoutes(app)
    clienteHandler.RegisterRoutes(app)
    claHandler.RegisterRoutes(app)
    badgeHandler.RegisterRoutes(app)
    storeHandler.RegisterRoutes(app)
    loyaltyHandler.RegisterRoutes(app)
    raidHandler.RegisterRoutes(app)
    queueHandler.RegisterRoutes(app)
    liveHandler.RegisterRoutes(app)

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("🚀 RuivoBarber API a correr na porta %s", port)
    log.Fatal(app.Listen(":" + port))
}
