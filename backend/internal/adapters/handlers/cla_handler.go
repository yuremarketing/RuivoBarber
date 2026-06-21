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

	api.Get("/clas", JWTMiddleware, h.ListarClas)
	api.Post("/clas", JWTMiddleware, h.CriarCla)
	api.Post("/clas/convidar", JWTMiddleware, RequireCargo("Cliente"), h.ConvidarUsuario)
	api.Get("/clas/convites", JWTMiddleware, RequireCargo("Cliente"), h.ListarConvites)
	api.Post("/clas/convites/:id/aceitar", JWTMiddleware, RequireCargo("Cliente"), h.AceitarConvite)
	api.Post("/clas/convites/:id/recusar", JWTMiddleware, RequireCargo("Cliente"), h.RecusarConvite)
	api.Get("/clas/me", JWTMiddleware, h.ObterMeuCla)
	api.Get("/clas/me/mural", JWTMiddleware, h.ObterMural)
	api.Post("/clas/me/mural", JWTMiddleware, h.PostarMural)
	api.Get("/clas/:id", JWTMiddleware, h.ObterClaPorID)
	api.Get("/clas/:id/membros", JWTMiddleware, h.ListarMembros)
	api.Get("/jogadores/busca", JWTMiddleware, h.BuscarJogadores)
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

func (h *ClaHandler) ListarClas(c *fiber.Ctx) error {
	ranking, err := h.service.ListarClas(c.UserContext())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(ranking)
}

func (h *ClaHandler) ObterMural(c *fiber.Ctx) error {
	userID := c.Locals("userId").(int)
	messages, err := h.service.ListarMensagensMural(c.UserContext(), userID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(messages)
}

func (h *ClaHandler) PostarMural(c *fiber.Ctx) error {
	userID := c.Locals("userId").(int)
	var req struct {
		Mensagem string `json:"mensagem"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "dados inválidos"})
	}

	msg, err := h.service.SalvarMensagemMural(c.UserContext(), userID, req.Mensagem)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(msg)
}

func (h *ClaHandler) BuscarJogadores(c *fiber.Ctx) error {
	query := c.Query("query")
	jogadores, err := h.service.BuscarJogadoresSemCla(c.UserContext(), query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(jogadores)
}
