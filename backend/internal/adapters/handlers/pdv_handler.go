package handlers

import (
	"context"
	"ruivobarber-api/internal/core/services"
	"ruivobarber-api/internal/infra"

	"github.com/gofiber/fiber/v2"
)

type PdvHandler struct {
	service *services.PdvService
}

func (h *PdvHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	api.Post("/pdv/caixa/abrir", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.AbrirCaixa)
	api.Post("/pdv/caixa/fechar", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.FecharCaixa)
	api.Get("/pdv/caixa/status", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ObterStatusCaixa)
	api.Post("/pdv/caixa/movimentar", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.MovimentarCaixa)
}

func NewPdvHandler(service *services.PdvService) *PdvHandler {
	return &PdvHandler{service: service}
}

type AbrirCaixaRequest struct {
	SaldoInicial float64 `json:"saldo_inicial"`
}

func (h *PdvHandler) AbrirCaixa(c *fiber.Ctx) error {
	if err := infra.Wait(context.Background()); err != nil {
		return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
	}

	var req AbrirCaixaRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	operadorID := c.Locals("userId").(int)
	caixa, err := h.service.AbrirCaixa(operadorID, req.SaldoInicial)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(caixa)
}

type FecharCaixaRequest struct {
	SaldoInformado float64 `json:"saldo_informado"`
}

func (h *PdvHandler) FecharCaixa(c *fiber.Ctx) error {
	if err := infra.Wait(context.Background()); err != nil {
		return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
	}

	var req FecharCaixaRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	operadorID := c.Locals("userId").(int)
	caixa, err := h.service.FecharCaixa(operadorID, req.SaldoInformado)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(caixa)
}

func (h *PdvHandler) ObterStatusCaixa(c *fiber.Ctx) error {
	if err := infra.Wait(context.Background()); err != nil {
		return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
	}

	operadorID := c.Locals("userId").(int)
	status, err := h.service.ObterStatusCaixa(operadorID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(status)
}

type MovimentarCaixaRequest struct {
	Tipo   string  `json:"tipo"`
	Valor  float64 `json:"valor"`
	Motivo string  `json:"motivo"`
}

func (h *PdvHandler) MovimentarCaixa(c *fiber.Ctx) error {
	if err := infra.Wait(context.Background()); err != nil {
		return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
	}

	var req MovimentarCaixaRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	operadorID := c.Locals("userId").(int)
	err := h.service.MovimentarCaixa(operadorID, req.Tipo, req.Valor, req.Motivo)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "sucesso"})
}
