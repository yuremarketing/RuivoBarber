package handlers

import (
	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/core/services"
)

type BadgeHandler struct {
	service *services.BadgeService
}

func NewBadgeHandler(service *services.BadgeService) *BadgeHandler {
	return &BadgeHandler{service: service}
}

func (h *BadgeHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	api.Get("/badges/me", JWTMiddleware, h.ListarBadgesDoUsuario)
}

func (h *BadgeHandler) ListarBadgesDoUsuario(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)

	badges, err := h.service.ListarBadgesDoUsuario(c.UserContext(), userId)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(badges)
}
