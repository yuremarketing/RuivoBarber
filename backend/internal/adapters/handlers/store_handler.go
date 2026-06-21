package handlers

import (
	"strconv"
	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/core/services"
)

type StoreHandler struct {
	service *services.StoreService
}

func NewStoreHandler(service *services.StoreService) *StoreHandler {
	return &StoreHandler{service: service}
}

func (h *StoreHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	api.Get("/loja/itens", JWTMiddleware, h.ListarItens)
	api.Post("/loja/itens/:id/comprar", JWTMiddleware, h.ComprarItem)
	api.Post("/loja/itens/:id/equipar", JWTMiddleware, h.EquiparItem)
	api.Post("/loja/itens/:id/desequipar", JWTMiddleware, h.DesequiparItem)
}

func (h *StoreHandler) ListarItens(c *fiber.Ctx) error {
	userID := c.Locals("userId").(int)

	items, err := h.service.ListarItens(c.UserContext(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(items)
}

func (h *StoreHandler) ComprarItem(c *fiber.Ctx) error {
	userID := c.Locals("userId").(int)
	itemID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID do item inválido"})
	}

	err = h.service.ComprarItem(c.UserContext(), userID, itemID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Item comprado com sucesso!"})
}

func (h *StoreHandler) EquiparItem(c *fiber.Ctx) error {
	userID := c.Locals("userId").(int)
	itemID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID do item inválido"})
	}

	err = h.service.EquiparItem(c.UserContext(), userID, itemID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Item equipado com sucesso!"})
}

func (h *StoreHandler) DesequiparItem(c *fiber.Ctx) error {
	userID := c.Locals("userId").(int)
	itemID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID do item inválido"})
	}

	err = h.service.DesequiparItem(c.UserContext(), userID, itemID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Item desequipado com sucesso!"})
}
