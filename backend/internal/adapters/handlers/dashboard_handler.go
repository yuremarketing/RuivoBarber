package handlers

import (
	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/core/services"
)

type DashboardHandler struct {
	service *services.DashboardService
}

func NewDashboardHandler(service *services.DashboardService) *DashboardHandler {
	return &DashboardHandler{service: service}
}

func (h *DashboardHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1/dashboard")
	// Somente admin deve acessar, idealmente teria middleware de auth aqui
	api.Get("/", h.GetDashboard)
}

func (h *DashboardHandler) GetDashboard(c *fiber.Ctx) error {
	data, err := h.service.GetDashboardData()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao buscar dados do dashboard"})
	}
	return c.JSON(data)
}
