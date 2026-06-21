package handlers

import (
	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/core/services"
)

type QuestHandler struct {
	service *services.QuestServiceImpl
}

func NewQuestHandler(service *services.QuestServiceImpl) *QuestHandler {
	return &QuestHandler{service: service}
}

func (h *QuestHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	api.Get("/clas/missoes", JWTMiddleware, h.ListarMissoesSemanais)
}

func (h *QuestHandler) ListarMissoesSemanais(c *fiber.Ctx) error {
	userID := c.Locals("userId").(int)

	quests, err := h.service.ListWeeklyQuests(c.UserContext(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(quests)
}
