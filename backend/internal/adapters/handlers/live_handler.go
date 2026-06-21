package handlers

import (
	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/services"
)

type LiveHandler struct {
	service *services.LiveService
}

func NewLiveHandler(service *services.LiveService) *LiveHandler {
	return &LiveHandler{service: service}
}

func (h *LiveHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	api.Get("/lives/ativa", JWTMiddleware, h.ObterLiveAtiva)
	api.Get("/lives", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ListarLives)
	api.Post("/lives", JWTMiddleware, RequireCargo("Adm"), h.CriarLive)
	api.Post("/lives/:id/ativar", JWTMiddleware, RequireCargo("Adm"), h.AtivarLive)
	api.Delete("/lives/:id", JWTMiddleware, RequireCargo("Adm"), h.ExcluirLive)
}

func (h *LiveHandler) ObterLiveAtiva(c *fiber.Ctx) error {
	l, err := h.service.ObterLiveAtiva(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if l == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "nenhuma live ativa no momento"})
	}
	return c.JSON(l)
}

func (h *LiveHandler) ListarLives(c *fiber.Ctx) error {
	lives, err := h.service.ListarLives(c.UserContext())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(lives)
}

func (h *LiveHandler) CriarLive(c *fiber.Ctx) error {
	var live domain.Live
	if err := c.BodyParser(&live); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "dados inválidos"})
	}

	err := h.service.CriarLive(c.UserContext(), &live)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(live)
}

func (h *LiveHandler) AtivarLive(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID de live inválido"})
	}

	err = h.service.AtivarLive(c.UserContext(), id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Live ativada com sucesso!"})
}

func (h *LiveHandler) ExcluirLive(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID de live inválido"})
	}

	err = h.service.ExcluirLive(c.UserContext(), id)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Live excluída com sucesso!"})
}
