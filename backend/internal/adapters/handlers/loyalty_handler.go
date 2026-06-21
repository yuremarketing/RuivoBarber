package handlers

import (
	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/core/services"
)

type LoyaltyHandler struct {
	service *services.LoyaltyService
}

func NewLoyaltyHandler(service *services.LoyaltyService) *LoyaltyHandler {
	return &LoyaltyHandler{service: service}
}

func (h *LoyaltyHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	api.Post("/loyalty/checkin", JWTMiddleware, h.RealizarCheckIn)
}

func (h *LoyaltyHandler) RealizarCheckIn(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)

	res, err := h.service.RealizarCheckIn(c.UserContext(), userId)
	if err != nil {
		if err.Error() == "você já resgatou sua recompensa diária hoje" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(res)
}
