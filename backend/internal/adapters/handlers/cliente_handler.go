package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/services"
	"ruivobarber-api/internal/infra"
)

type ClienteHandler struct {
	service *services.ClienteService
}

type LoginRequest struct {
	Login string `json:"login"`
	Senha string `json:"senha"`
}

type CadastrarClienteRequest struct {
	Nome  string `json:"nome"`
	Login string `json:"login"`
	Senha string `json:"senha"`
}

func NewClienteHandler(service *services.ClienteService) *ClienteHandler {
	return &ClienteHandler{service: service}
}

func JWTMiddleware(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token não fornecido"})
	}

	const prefix = "Bearer "
	if len(authHeader) < len(prefix) || authHeader[:len(prefix)] != prefix {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Formato de token inválido"})
	}

	tokenString := authHeader[len(prefix):]

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "ruivobarber_secret_token"
	}

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de assinatura inesperado: %v", t.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido ou expirado"})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Claims inválidos"})
	}

	c.Locals("userId", int(claims["id"].(float64)))
	c.Locals("userNome", claims["nome"].(string))
	c.Locals("userCargo", claims["cargo"].(string))

	return c.Next()
}

func RequireCargo(cargos ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userCargo := c.Locals("userCargo").(string)
		for _, cargo := range cargos {
			if userCargo == cargo {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Acesso não autorizado para este cargo"})
	}
}

func (h *ClienteHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")
	
	// Rotas Públicas
	api.Post("/auth/login", h.Login)
	api.Post("/auth/register", h.RegisterPublico)
	api.Post("/auth/google", h.GoogleLogin)
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "RuivoBarber API"})
	})

	// Rotas de Clientes (Protegidas)
	api.Get("/clientes", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ListarClientes)
	api.Post("/clientes", JWTMiddleware, RequireCargo("Adm"), h.CadastrarCliente)
	api.Get("/clientes/:id", JWTMiddleware, h.BuscarCliente)

	// Rotas de Atendimentos (Protegidas)
	api.Post("/atendimentos/concluir", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ConcluirAtendimento)
	api.Post("/atendimentos/falta", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.RegistrarFalta)

	// Rotas de Cupons (Protegidas)
	api.Post("/cupons/resgatar", JWTMiddleware, RequireCargo("Cliente"), h.ResgatarCupom)
	api.Post("/cupons/validar", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ValidarCupom)

	// Rotas de Chat de IA e Agendamentos Dinâmicos
	api.Post("/chat/stream", JWTMiddleware, h.ChatStream)
	api.Get("/servicos", h.ListarServicos)
	api.Get("/barbeiros", JWTMiddleware, h.ListarBarbeiros)
	api.Get("/agendamentos", JWTMiddleware, h.ListarAgendamentos)
	api.Post("/agendamentos", JWTMiddleware, h.CriarAgendamento)
}

func (h *ClienteHandler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	if req.Login == "" || req.Senha == "" {
		return c.Status(400).JSON(fiber.Map{"error": "login e senha são obrigatórios"})
	}

	cliente, token, err := h.service.Login(req.Login, req.Senha)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":    cliente.ID,
			"nome":  cliente.Nome,
			"login": cliente.Login,
			"cargo": cliente.Cargo,
			"xp":    cliente.XP,
			"nivel": cliente.Nivel,
		},
	})
}

func (h *ClienteHandler) ListarClientes(c *fiber.Ctx) error {
	if err := infra.Wait(context.Background()); err != nil {
		return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
	}

	clientes, err := h.service.ListarClientes()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(clientes)
}

func (h *ClienteHandler) BuscarCliente(c *fiber.Ctx) error {
	if err := infra.Wait(context.Background()); err != nil {
		return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
	}

	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID inválido"})
	}

	// Restrição de Cliente comum para ler apenas o próprio perfil
	userCargo := c.Locals("userCargo").(string)
	userId := c.Locals("userId").(int)
	if userCargo == "Cliente" && userId != id {
		return c.Status(403).JSON(fiber.Map{"error": "Acesso não autorizado para esta ficha"})
	}

	cliente, err := h.service.BuscarCliente(id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Cliente não encontrado"})
	}
	return c.JSON(cliente)
}

func (h *ClienteHandler) ConcluirAtendimento(c *fiber.Ctx) error {
    if err := infra.Wait(context.Background()); err != nil {
        return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
    }

    var req domain.ConcluirAtendimentoRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
    }

    if req.AgendamentoID <= 0 {
        return c.Status(400).JSON(fiber.Map{"error": "agendamento_id inválido"})
    }

    err := h.service.ConcluirAtendimento(req.AgendamentoID)
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"status": "concluido"})
}

func (h *ClienteHandler) RegistrarFalta(c *fiber.Ctx) error {
    if err := infra.Wait(context.Background()); err != nil {
        return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
    }

    var req domain.FaltaAtendimentoRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
    }

    if req.AgendamentoID <= 0 {
        return c.Status(400).JSON(fiber.Map{"error": "agendamento_id inválido"})
    }

    err := h.service.RegistrarFalta(req.AgendamentoID)
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"status": "falta_registrada"})
}

func (h *ClienteHandler) ResgatarCupom(c *fiber.Ctx) error {
    if err := infra.Wait(context.Background()); err != nil {
        return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
    }

    var req domain.ResgatarCupomRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
    }

    if req.ClienteID <= 0 {
        return c.Status(400).JSON(fiber.Map{"error": "cliente_id inválido"})
    }
    if req.NivelID <= 0 {
        return c.Status(400).JSON(fiber.Map{"error": "nivel_id inválido"})
    }

    cupom, err := h.service.ResgatarCupom(req.ClienteID, req.NivelID)
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(cupom)
}

func (h *ClienteHandler) ValidarCupom(c *fiber.Ctx) error {
    if err := infra.Wait(context.Background()); err != nil {
        return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
    }

    var req domain.ValidarCupomRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
    }

    if req.Codigo == "" {
        return c.Status(400).JSON(fiber.Map{"error": "codigo inválido"})
    }

    cupom, err := h.service.ValidarCupom(req.Codigo)
    if err != nil {
        if err.Error() == "cupom não encontrado" {
            return c.Status(404).JSON(fiber.Map{"error": err.Error()})
        }
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(cupom)
}

func (h *ClienteHandler) CadastrarCliente(c *fiber.Ctx) error {
	if err := infra.Wait(context.Background()); err != nil {
		return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
	}

	var req CadastrarClienteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	if req.Nome == "" || req.Login == "" || req.Senha == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Nome, login e senha são obrigatórios"})
	}

	cliente := &domain.Cliente{
		Nome:  req.Nome,
		Login: req.Login,
	}

	err := h.service.CadastrarCliente(cliente, req.Senha)
	if err != nil {
		if err.Error() == "login já cadastrado no sistema" {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(cliente)
}

func (h *ClienteHandler) ListarServicos(c *fiber.Ctx) error {
	servicos, err := h.service.ListarServicos()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(servicos)
}

func (h *ClienteHandler) ListarBarbeiros(c *fiber.Ctx) error {
	barbeiros, err := h.service.ListarBarbeiros()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(barbeiros)
}

func (h *ClienteHandler) ListarAgendamentos(c *fiber.Ctx) error {
	userCargo := c.Locals("userCargo").(string)
	userId := c.Locals("userId").(int)
	
	// Se for cliente, lista apenas os seus agendamentos
	if userCargo == "Cliente" {
		agendamentos, err := h.service.ListarAgendamentosDoCliente(userId)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(agendamentos)
	}

	// Senão, lista por data (se fornecida, ou assume a de hoje)
	data := c.Query("data")
	if data == "" {
		data = time.Now().Format("2006-01-02")
	}
	agendamentos, err := h.service.ListarAgendamentos(data)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(agendamentos)
}

func (h *ClienteHandler) CriarAgendamento(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)
	
	var req struct {
		BarbeiroID int    `json:"barbeiro_id"`
		ServicoID  int    `json:"servico_id"`
		DataHora   string `json:"data_hora"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo inválido"})
	}

	parsedTime, err := time.ParseInLocation("2006-01-02 15:04", req.DataHora, time.Local)
	if err != nil {
		parsedTime, err = time.Parse(time.RFC3339, req.DataHora)
	}
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "formato de data/hora inválido. Use YYYY-MM-DD HH:MM ou RFC3339"})
	}

	id, err := h.service.CriarAgendamento(userId, req.BarbeiroID, req.ServicoID, parsedTime)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{"id": id, "status": "Pendente"})
}

func (h *ClienteHandler) ChatStream(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)
	userNome := c.Locals("userNome").(string)

	var req struct {
		Message string                   `json:"message"`
		History []services.GeminiContent `json:"history"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo inválido"})
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		writeChunk := func(text string) {
			payload := fiber.Map{"text": text}
			jsonData, _ := json.Marshal(payload)
			fmt.Fprintf(w, "data: %s\n\n", string(jsonData))
			w.Flush()
		}

		err := h.service.ProcessarChatStream(userId, userNome, req.Message, req.History, writeChunk)
		if err != nil {
			log.Printf("[CHAT] Erro ao processar chat stream: %v", err)
			payload := fiber.Map{"error": err.Error()}
			jsonData, _ := json.Marshal(payload)
			fmt.Fprintf(w, "data: %s\n\n", string(jsonData))
			w.Flush()
		}
		
		fmt.Fprintf(w, "data: [DONE]\n\n")
		w.Flush()
	})

	return nil
}

func (h *ClienteHandler) RegisterPublico(c *fiber.Ctx) error {
	var req CadastrarClienteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	if req.Nome == "" || req.Login == "" || req.Senha == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Nome, login e senha são obrigatórios"})
	}

	cliente := &domain.Cliente{
		Nome:  req.Nome,
		Login: req.Login,
	}

	err := h.service.CadastrarCliente(cliente, req.Senha)
	if err != nil {
		if err.Error() == "login já cadastrado no sistema" {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Login automático após registro
	loggedCliente, token, loginErr := h.service.Login(req.Login, req.Senha)
	if loginErr != nil {
		return c.Status(201).JSON(fiber.Map{"user": cliente})
	}

	return c.Status(201).JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":    loggedCliente.ID,
			"nome":  loggedCliente.Nome,
			"login": loggedCliente.Login,
			"cargo": loggedCliente.Cargo,
			"xp":    loggedCliente.XP,
			"nivel": loggedCliente.Nivel,
		},
	})
}

func (h *ClienteHandler) GoogleLogin(c *fiber.Ctx) error {
	var req struct {
		Credential string `json:"credential"`
		IDToken    string `json:"id_token"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	idToken := req.Credential
	if idToken == "" {
		idToken = req.IDToken
	}

	if idToken == "" {
		return c.Status(400).JSON(fiber.Map{"error": "credential ou id_token é obrigatório"})
	}

	var email, nome string

	// Suporte a Simulação Local para testes simplificados
	if strings.HasPrefix(idToken, "mock_google_") {
		if os.Getenv("APP_ENV") == "production" {
			return c.Status(401).JSON(fiber.Map{"error": "tokens mockados não são permitidos em produção"})
		}
		email = strings.TrimPrefix(idToken, "mock_google_")
		nome = "Google Client Test"
	} else {
		// Validar token no endpoint oficial do Google
		googleURL := fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", idToken)
		resp, err := http.Get(googleURL)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "falha ao conectar na API do Google"})
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			return c.Status(401).JSON(fiber.Map{"error": "token do Google inválido ou expirado"})
		}

		var googleInfo struct {
			Email string `json:"email"`
			Name  string `json:"name"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&googleInfo); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "falha ao parsear informações do Google"})
		}

		email = googleInfo.Email
		nome = googleInfo.Name
	}

	if email == "" {
		return c.Status(400).JSON(fiber.Map{"error": "não foi possível extrair o e-mail do token do Google"})
	}

	if nome == "" {
		nome = "Google User"
	}

	cliente, token, err := h.service.GoogleLogin(email, nome)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":    cliente.ID,
			"nome":  cliente.Nome,
			"login": cliente.Login,
			"cargo": cliente.Cargo,
			"xp":    cliente.XP,
			"nivel": cliente.Nivel,
		},
	})
}



