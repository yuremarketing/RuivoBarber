package handlers

import (
	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/core/services"
)

type RaidHandler struct {
	service *services.RaidService
}

func NewRaidHandler(service *services.RaidService) *RaidHandler {
	return &RaidHandler{service: service}
}

func (h *RaidHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	api.Get("/raids/ativa", JWTMiddleware, h.ObterRaidAtiva)
	api.Post("/raids/resgatar", JWTMiddleware, h.ResgatarRecompensa)
}

func (h *RaidHandler) ObterRaidAtiva(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)

	res, err := h.service.ObterStatusRaidAtiva(c.UserContext(), userId)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(res)
}

type ResgatarRecompensaRequest struct {
	RaidID int `json:"raidId"`
}

func (h *RaidHandler) ResgatarRecompensa(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)

	var req ResgatarRecompensaRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "corpo da requisição inválido"})
	}

	if req.RaidID <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID da raid inválido"})
	}

	err := h.service.ResgatarRecompensa(c.UserContext(), req.RaidID, userId)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Recompensa resgatada com sucesso!"})
}
