package handlers

import (
	"strconv"
	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/core/services"
)

type ClaHandler struct {
	service *services.ClaService
}

func NewClaHandler(service *services.ClaService) *ClaHandler {
	return &ClaHandler{service: service}
}

func (h *ClaHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	api.Post("/clas", JWTMiddleware, h.CriarCla)
	api.Post("/clas/convidar", JWTMiddleware, RequireCargo("Cliente"), h.ConvidarUsuario)
	api.Get("/clas/convites", JWTMiddleware, RequireCargo("Cliente"), h.ListarConvites)
	api.Post("/clas/convites/:id/aceitar", JWTMiddleware, RequireCargo("Cliente"), h.AceitarConvite)
	api.Post("/clas/convites/:id/recusar", JWTMiddleware, RequireCargo("Cliente"), h.RecusarConvite)
	api.Get("/clas/me", JWTMiddleware, h.ObterMeuCla)
	api.Get("/clas/:id", JWTMiddleware, h.ObterClaPorID)
	api.Get("/clas/:id/membros", JWTMiddleware, h.ListarMembros)
}

func (h *ClaHandler) CriarCla(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)

	var req struct {
		Nome      string `json:"nome"`
		Descricao string `json:"descricao"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	if req.Nome == "" {
		return c.Status(400).JSON(fiber.Map{"error": "o nome do clã é obrigatório"})
	}

	cla, err := h.service.CriarCla(c.UserContext(), userId, req.Nome, req.Descricao)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(cla)
}

func (h *ClaHandler) ConvidarUsuario(c *fiber.Ctx) error {
	liderID := c.Locals("userId").(int)

	var req struct {
		ConvidadoID int `json:"convidadoId"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	if req.ConvidadoID <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "convidadoId inválido"})
	}

	err := h.service.ConvidarUsuario(c.UserContext(), liderID, req.ConvidadoID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Convite enviado com sucesso!"})
}

func (h *ClaHandler) ListarConvites(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)

	convites, err := h.service.ListarConvites(c.UserContext(), userId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(convites)
}

func (h *ClaHandler) AceitarConvite(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)
	inviteID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID do convite inválido"})
	}

	err = h.service.AceitarConvite(c.UserContext(), inviteID, userId)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Convite aceito com sucesso!"})
}

func (h *ClaHandler) RecusarConvite(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)
	inviteID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID do convite inválido"})
	}

	err = h.service.RecusarConvite(c.UserContext(), inviteID, userId)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Convite recusado com sucesso!"})
}

func (h *ClaHandler) ListarMembros(c *fiber.Ctx) error {
	claID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID do clã inválido"})
	}

	membros, err := h.service.ListarMembros(c.UserContext(), claID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(membros)
}

func (h *ClaHandler) ObterMeuCla(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)

	cla, err := h.service.ObterClaDoUsuario(c.UserContext(), userId)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(cla)
}

func (h *ClaHandler) ObterClaPorID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID do clã inválido"})
	}

	cla, err := h.service.ObterClaPorID(c.UserContext(), id)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(cla)
}
