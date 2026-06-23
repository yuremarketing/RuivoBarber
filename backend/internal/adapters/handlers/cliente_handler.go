package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
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

func getSaoPauloLocation() *time.Location {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		return time.FixedZone("America/Sao_Paulo", -3*60*60)
	}
	return loc
}

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
	api.Put("/clientes/:id/perfil", JWTMiddleware, h.AtualizarPerfil)
	api.Get("/games/hall-of-fame", JWTMiddleware, h.ObterHallOfFame)

	// Rotas de Atendimentos (Protegidas)
	api.Post("/atendimentos/concluir", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ConcluirAtendimento)
	api.Post("/atendimentos/falta", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.RegistrarFalta)

	// Rotas de Cupons (Protegidas)
	api.Post("/cupons/resgatar", JWTMiddleware, RequireCargo("Cliente"), h.ResgatarCupom)
	api.Post("/cupons/validar", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ValidarCupom)

	// Rotas de Chat de IA e Agendamentos Dinâmicos
	api.Post("/chat/stream", JWTMiddleware, h.ChatStream)
	api.Get("/servicos", h.ListarServicos)
	api.Post("/servicos", JWTMiddleware, RequireCargo("Adm"), h.CriarServico)
	api.Put("/servicos/:id", JWTMiddleware, RequireCargo("Adm"), h.AtualizarServico)
	api.Delete("/servicos/:id", JWTMiddleware, RequireCargo("Adm"), h.DeletarServico)
	api.Get("/barbeiros", JWTMiddleware, h.ListarBarbeiros)
	api.Get("/barbeiros/:id/agenda", JWTMiddleware, h.ObterAgendaBarbeiro)
	api.Get("/barbeiros/:id/disponibilidade", JWTMiddleware, h.ObterDisponibilidadeBarbeiro)
	api.Post("/barbeiros/:id/disponibilidade", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.SalvarDisponibilidadeBarbeiro)
	api.Get("/barbeiros/:id/bloqueios", JWTMiddleware, h.ObterBloqueiosBarbeiro)
	api.Post("/barbeiros/:id/bloqueios", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.AdicionarBloqueioBarbeiro)
	api.Delete("/barbeiros/:id/bloqueios/:date", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.RemoverBloqueioBarbeiro)
	api.Get("/agendamentos", JWTMiddleware, h.ListarAgendamentos)
	api.Post("/agendamentos", JWTMiddleware, h.CriarAgendamento)
	api.Post("/barbeiros/:id/chave-pix", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.SalvarChavePixBarbeiro)
	api.Post("/gorjetas", JWTMiddleware, h.CriarGorjeta)
	api.Post("/gorjetas/:id/confirmar", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ConfirmarPagamentoGorjeta)
	api.Get("/barbeiros/:id/gorjetas", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ObterGorjetasDoBarbeiro)

	api.Get("/configuracoes", JWTMiddleware, RequireCargo("Adm"), h.ObterConfiguracoes)
	api.Post("/configuracoes", JWTMiddleware, RequireCargo("Adm"), h.SalvarConfiguracoes)
	api.Get("/webhook/whatsapp", h.WebhookWhatsAppVerification)
	api.Post("/webhook/whatsapp", h.WebhookWhatsApp)

	// Rotas de Temporadas
	api.Get("/temporadas", JWTMiddleware, h.ListarTemporadas)
	api.Get("/temporadas/ativa", JWTMiddleware, h.ObterTemporadaAtiva)
	api.Post("/temporadas", JWTMiddleware, RequireCargo("Adm"), h.CriarTemporada)
	api.Put("/temporadas/:id", JWTMiddleware, RequireCargo("Adm"), h.AtualizarTemporada)
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
			"id":        cliente.ID,
			"nome":      cliente.Nome,
			"login":     cliente.Login,
			"cargo":     cliente.Cargo,
			"xp":        cliente.XP,
			"nivel":     cliente.Nivel,
			"avatarUrl": cliente.AvatarURL,
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

func (h *ClienteHandler) ObterHallOfFame(c *fiber.Ctx) error {
	if err := infra.Wait(context.Background()); err != nil {
		return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
	}

	clientes, err := h.service.ObterHallOfFame()
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

	saoPaulo := getSaoPauloLocation()
	parsedTime, err := time.ParseInLocation("2006-01-02 15:04", req.DataHora, saoPaulo)
	if err != nil {
		parsedTime, err = time.Parse(time.RFC3339, req.DataHora)
		if err == nil {
			parsedTime = parsedTime.In(saoPaulo)
		}
	}
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "formato de data/hora inválido. Use YYYY-MM-DD HH:MM ou RFC3339"})
	}

	id, err := h.service.CriarAgendamento(userId, req.BarbeiroID, req.ServicoID, parsedTime)
	if err != nil {
		status := 400
		if strings.Contains(err.Error(), "conflito") {
			status = 409
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{"id": id, "status": "Pendente"})
}

func (h *ClienteHandler) ObterAgendaBarbeiro(c *fiber.Ctx) error {
	idStr := c.Params("id")
	barbeiroID, err := strconv.Atoi(idStr)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id do barbeiro inválido"})
	}

	dataStr := c.Query("data")
	if dataStr == "" {
		return c.Status(400).JSON(fiber.Map{"error": "parâmetro 'data' é obrigatório (formato YYYY-MM-DD)"})
	}

	servicoIDStr := c.Query("servico_id")
	servicoID := 0
	if servicoIDStr != "" {
		servicoID, _ = strconv.Atoi(servicoIDStr)
	}

	slots, err := h.service.ObterAgendaBarbeiro(barbeiroID, dataStr, servicoID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(slots)
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
			"id":        loggedCliente.ID,
			"nome":      loggedCliente.Nome,
			"login":     loggedCliente.Login,
			"cargo":     loggedCliente.Cargo,
			"xp":        loggedCliente.XP,
			"nivel":     loggedCliente.Nivel,
			"avatarUrl": loggedCliente.AvatarURL,
		},
	})
}

func (h *ClienteHandler) GoogleLogin(c *fiber.Ctx) error {
	return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
		"error": "Login com Google desativado temporariamente para manutenção de segurança. Será reativado na última fase do projeto.",
	})
}

func (h *ClienteHandler) AtualizarPerfil(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID inválido"})
	}

	userCargo := c.Locals("userCargo").(string)
	userId := c.Locals("userId").(int)

	if userCargo != "Adm" && userId != id {
		return c.Status(403).JSON(fiber.Map{"error": "Acesso não autorizado para esta conta"})
	}

	var req struct {
		Nome      string `json:"nome"`
		Login     string `json:"login"`
		Senha     string `json:"senha"`
		AvatarURL string `json:"avatarUrl"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	err = h.service.AtualizarPerfil(id, req.Nome, req.Login, req.Senha, req.AvatarURL)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	cliente, err := h.service.BuscarCliente(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "erro ao recuperar dados atualizados"})
	}

	return c.JSON(fiber.Map{
		"message": "Perfil updated com sucesso!",
		"user": fiber.Map{
			"id":        cliente.ID,
			"nome":      cliente.Nome,
			"login":     cliente.Login,
			"cargo":     cliente.Cargo,
			"xp":        cliente.XP,
			"nivel":     cliente.Nivel,
			"avatarUrl": cliente.AvatarURL,
		},
	})
}

func (h *ClienteHandler) ListarTemporadas(c *fiber.Ctx) error {
	temporadas, err := h.service.ListarTemporadas()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(temporadas)
}

func (h *ClienteHandler) ObterTemporadaAtiva(c *fiber.Ctx) error {
	t, err := h.service.ObterTemporadaAtiva()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if t == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Nenhuma temporada ativa encontrada"})
	}
	return c.JSON(t)
}

func (h *ClienteHandler) CriarTemporada(c *fiber.Ctx) error {
	var req struct {
		Nome       string `json:"nome"`
		DataInicio string `json:"dataInicio"`
		DataFim    string `json:"dataFim"`
		Ativa      bool   `json:"ativa"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo de requisição inválido"})
	}

	inicio, err := parseDateTime(req.DataInicio)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	fim, err := parseDateTime(req.DataFim)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	t, err := h.service.CriarTemporada(req.Nome, inicio, fim, req.Ativa)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(t)
}

func (h *ClienteHandler) AtualizarTemporada(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID inválido"})
	}

	var req struct {
		Nome       string `json:"nome"`
		DataInicio string `json:"dataInicio"`
		DataFim    string `json:"dataFim"`
		Ativa      bool   `json:"ativa"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo de requisição inválido"})
	}

	inicio, err := parseDateTime(req.DataInicio)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	fim, err := parseDateTime(req.DataFim)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	t, err := h.service.AtualizarTemporada(id, req.Nome, inicio, fim, req.Ativa)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(t)
}

func parseDateTime(s string) (time.Time, error) {
	formats := []string{
		time.RFC3339,
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02T15:04:05",
		"2006-01-02",
	}
	for _, f := range formats {
		t, err := time.Parse(f, s)
		if err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("formato de data inválido: %s", s)
}

func (h *ClienteHandler) ObterConfiguracoes(c *fiber.Ctx) error {
	cfg, err := h.service.ObterConfiguracoes()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(cfg)
}

func (h *ClienteHandler) SalvarConfiguracoes(c *fiber.Ctx) error {
	var req struct {
		ChaveAPIWhatsApp string `json:"chaveApiWhatsapp"`
		UrlWebhook       string `json:"urlWebhook"`
		TokenValidacao   string `json:"tokenValidacao"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	cfg := &domain.Configuracoes{
		ChaveAPIWhatsApp: req.ChaveAPIWhatsApp,
		UrlWebhook:       req.UrlWebhook,
		TokenValidacao:   req.TokenValidacao,
	}

	err := h.service.SalvarConfiguracoes(cfg)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(cfg)
}

func (h *ClienteHandler) WebhookWhatsAppVerification(c *fiber.Ctx) error {
	mode := c.Query("hub.mode")
	challenge := c.Query("hub.challenge")
	verifyToken := c.Query("hub.verify_token")

	cfg, err := h.service.ObterConfiguracoes()
	if err != nil {
		return c.Status(500).SendString("Erro no servidor")
	}

	if mode == "subscribe" && verifyToken == cfg.TokenValidacao && cfg.TokenValidacao != "" {
		return c.SendString(challenge)
	}

	return c.Status(403).SendString("Token de verificação inválido")
}

func (h *ClienteHandler) WebhookWhatsApp(c *fiber.Ctx) error {
	var req struct {
		MessageID string `json:"message_id"`
		Sender    string `json:"sender"`
		Message   string `json:"message"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo inválido"})
	}

	if req.MessageID == "" || req.Sender == "" || req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "message_id, sender e message são obrigatórios"})
	}

	cfg, err := h.service.ObterConfiguracoes()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro interno"})
	}

	tokenHeader := c.Get("X-WhatsApp-Token")
	if tokenHeader == "" {
		tokenHeader = c.Query("token")
	}
	if cfg.TokenValidacao != "" && tokenHeader != cfg.TokenValidacao {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token de autenticação inválido"})
	}

	inserted, err := h.service.RegistrarMensagemProcessada(req.MessageID)
	if err != nil {
		log.Printf("[WEBHOOK] Erro ao registrar message_id: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "erro interno"})
	}
	if !inserted {
		log.Printf("[WEBHOOK] Mensagem duplicada ignorada: %s", req.MessageID)
		return c.JSON(fiber.Map{"status": "duplicada_ignorada"})
	}

	response, err := h.service.ProcessarChatWhatsApp(req.Sender, req.Message)
	if err != nil {
		log.Printf("[WEBHOOK] Erro ao processar mensagem do chat: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	log.Printf("\n📱 [WHATSAPP OUTGOING WEBHOOK] Enviando mensagem de volta para %s:\n\"%s\"\n", req.Sender, response)

	return c.JSON(fiber.Map{"status": "sucesso", "resposta": response})
}

func (h *ClienteHandler) CriarServico(c *fiber.Ctx) error {
	var s domain.Servico
	if err := c.BodyParser(&s); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo inválido"})
	}
	if s.Nome == "" || s.Preco <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "nome e preço são obrigatórios"})
	}
	id, err := h.service.CriarServico(&s)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	s.ID = id
	return c.Status(201).JSON(s)
}

func (h *ClienteHandler) AtualizarServico(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id inválido"})
	}
	var s domain.Servico
	if err := c.BodyParser(&s); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo inválido"})
	}
	if s.Nome == "" || s.Preco <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "nome e preço são obrigatórios"})
	}
	s.ID = id
	err = h.service.AtualizarServico(&s)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(s)
}

func (h *ClienteHandler) DeletarServico(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id inválido"})
	}
	err = h.service.DeletarServico(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(204)
}

func (h *ClienteHandler) ObterDisponibilidadeBarbeiro(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id inválido"})
	}
	disps, err := h.service.ObterDisponibilidadeBarbeiro(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(disps)
}

func (h *ClienteHandler) SalvarDisponibilidadeBarbeiro(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id inválido"})
	}

	userId := c.Locals("userId").(int)
	userCargo := c.Locals("userCargo").(string)
	if userCargo != "Adm" && userId != id {
		return c.Status(403).JSON(fiber.Map{"error": "Você não tem permissão para alterar a escala deste barbeiro"})
	}

	var disps []domain.BarbeiroDisponibilidade
	if err := c.BodyParser(&disps); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo inválido"})
	}

	err = h.service.SalvarDisponibilidadeBarbeiro(id, disps)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "sucesso"})
}

func (h *ClienteHandler) ObterBloqueiosBarbeiro(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id inválido"})
	}
	bloqueios, err := h.service.ObterBloqueiosBarbeiro(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(bloqueios)
}

type AddBloqueioRequest struct {
	Data   string `json:"data"`
	Motivo string `json:"motivo"`
}

func (h *ClienteHandler) AdicionarBloqueioBarbeiro(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id inválido"})
	}

	userId := c.Locals("userId").(int)
	userCargo := c.Locals("userCargo").(string)
	if userCargo != "Adm" && userId != id {
		return c.Status(403).JSON(fiber.Map{"error": "Você não tem permissão para alterar folgas deste barbeiro"})
	}

	var req AddBloqueioRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo inválido"})
	}
	if req.Data == "" {
		return c.Status(400).JSON(fiber.Map{"error": "data é obrigatória"})
	}

	err = h.service.AdicionarBloqueioBarbeiro(id, req.Data, req.Motivo)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "sucesso"})
}

func (h *ClienteHandler) RemoverBloqueioBarbeiro(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id inválido"})
	}

	userId := c.Locals("userId").(int)
	userCargo := c.Locals("userCargo").(string)
	if userCargo != "Adm" && userId != id {
		return c.Status(403).JSON(fiber.Map{"error": "Você não tem permissão para alterar folgas deste barbeiro"})
	}

	date := c.Params("date")
	if date == "" {
		return c.Status(400).JSON(fiber.Map{"error": "data inválida"})
	}

	err = h.service.RemoverBloqueioBarbeiro(id, date)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "sucesso"})
}

func (h *ClienteHandler) SalvarChavePixBarbeiro(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id de barbeiro inválido"})
	}

	userId := c.Locals("userId").(int)
	userCargo := c.Locals("userCargo").(string)
	if userCargo != "Adm" && userId != id {
		return c.Status(403).JSON(fiber.Map{"error": "Você só pode alterar sua própria chave Pix ou deve ser administrador"})
	}

	var req struct {
		ChavePix string `json:"chave_pix"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo inválido"})
	}

	err = h.service.SalvarChavePixBarbeiro(id, req.ChavePix)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "sucesso", "chave_pix": req.ChavePix})
}

type CriarGorjetaRequest struct {
	AgendamentoID *int    `json:"agendamento_id"`
	BarbeiroID    int     `json:"barbeiro_id"`
	Valor         float64 `json:"valor"`
}

func (h *ClienteHandler) CriarGorjeta(c *fiber.Ctx) error {
	var req CriarGorjetaRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo inválido"})
	}

	if req.BarbeiroID <= 0 || req.Valor <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "barbeiro_id e valor (maior que 0) são obrigatórios"})
	}

	clienteID := c.Locals("userId").(int)

	g, err := h.service.CriarGorjeta(req.AgendamentoID, &clienteID, req.BarbeiroID, req.Valor)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(g)
}

func (h *ClienteHandler) ConfirmarPagamentoGorjeta(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id inválido"})
	}

	err = h.service.ConfirmarPagamentoGorjeta(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "sucesso"})
}

func (h *ClienteHandler) ObterGorjetasDoBarbeiro(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id inválido"})
	}

	userId := c.Locals("userId").(int)
	userCargo := c.Locals("userCargo").(string)
	if userCargo != "Adm" && userId != id {
		return c.Status(403).JSON(fiber.Map{"error": "Você só pode consultar suas próprias gorjetas ou deve ser administrador"})
	}

	gorjetas, err := h.service.ObterGorjetasDoBarbeiro(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(gorjetas)
}





