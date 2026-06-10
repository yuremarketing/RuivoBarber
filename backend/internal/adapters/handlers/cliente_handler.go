package handlers

import (
	"context"
	"fmt"
	"os"
	"strconv"

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
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "RuivoBarber API"})
	})

	// Rotas de Clientes (Protegidas)
	api.Get("/clientes", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ListarClientes)
	api.Get("/clientes/:id", JWTMiddleware, h.BuscarCliente)

	// Rotas de Atendimentos (Protegidas)
	api.Post("/atendimentos/concluir", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ConcluirAtendimento)
	api.Post("/atendimentos/falta", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.RegistrarFalta)

	// Rotas de Cupons (Protegidas)
	api.Post("/cupons/resgatar", JWTMiddleware, RequireCargo("Cliente"), h.ResgatarCupom)
	api.Post("/cupons/validar", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ValidarCupom)
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
