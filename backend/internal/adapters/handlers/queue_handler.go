package handlers

import (
	"strconv"
	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/core/services"
)

type QueueHandler struct {
	service *services.QueueService
}

func NewQueueHandler(service *services.QueueService) *QueueHandler {
	return &QueueHandler{service: service}
}

func (h *QueueHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	// Rotas restritas a Admins e Barbeiros
	api.Post("/atendimentos/:id/checkin", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.RegistrarCheckIn)
	api.Post("/atendimentos/:id/em-cadeira", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.RegistrarEmCadeira)
	api.Get("/atendimentos/metricas", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ObterMetricas)
}

func (h *QueueHandler) RegistrarCheckIn(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID de agendamento inválido"})
	}

	err = h.service.RegistrarCheckIn(c.UserContext(), id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Check-in realizado com sucesso!"})
}

func (h *QueueHandler) RegistrarEmCadeira(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID de agendamento inválido"})
	}

	err = h.service.RegistrarEmCadeira(c.UserContext(), id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Atendimento iniciado ('Em Cadeira') com sucesso!"})
}

func (h *QueueHandler) ObterMetricas(c *fiber.Ctx) error {
	var barbeiroID *int
	barbQuery := c.Query("barbeiro_id")
	if barbQuery != "" {
		bID, err := strconv.Atoi(barbQuery)
		if err == nil {
			barbeiroID = &bID
		}
	}

	m, err := h.service.ObterMetricas(c.UserContext(), barbeiroID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(m)
}
