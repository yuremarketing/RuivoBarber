package handlers

import (
    "context"
    "strconv"

    "github.com/gofiber/fiber/v2"
    "ruivobarber-api/internal/core/domain"
    "ruivobarber-api/internal/core/services"
    "ruivobarber-api/internal/infra"
)

type ClienteHandler struct {
    service *services.ClienteService
}

func NewClienteHandler(service *services.ClienteService) *ClienteHandler {
    return &ClienteHandler{service: service}
}

func (h *ClienteHandler) RegisterRoutes(app *fiber.App) {
    api := app.Group("/api/v1")
    api.Get("/clientes", h.ListarClientes)
    api.Get("/clientes/:id", h.BuscarCliente)
    api.Post("/atendimentos/concluir", h.ConcluirAtendimento)
    api.Post("/atendimentos/falta", h.RegistrarFalta)
    api.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{"status": "ok", "service": "RuivoBarber API"})
    })
}

func (h *ClienteHandler) ListarClientes(c *fiber.Ctx) error {
    if err := infra.Wait(context.Background()); err != nil {
        return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
    }

    clientes, err := h.service.ListarClientes()
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(clientes)
}

func (h *ClienteHandler) BuscarCliente(c *fiber.Ctx) error {
    if err := infra.Wait(context.Background()); err != nil {
        return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
    }

    id, err := strconv.Atoi(c.Params("id"))
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "ID inválido"})
    }
    cliente, err := h.service.BuscarCliente(id)
    if err != nil {
        return c.Status(404).JSON(fiber.Map{"error": "Cliente não encontrado"})
    }
    return c.JSON(cliente)
}

func (h *ClienteHandler) ConcluirAtendimento(c *fiber.Ctx) error {
    if err := infra.Wait(context.Background()); err != nil {
        return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
    }

    var req domain.ConcluirAtendimentoRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
    }

    if req.AgendamentoID <= 0 {
        return c.Status(400).JSON(fiber.Map{"error": "agendamento_id inválido"})
    }

    err := h.service.ConcluirAtendimento(req.AgendamentoID)
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"status": "concluido"})
}

func (h *ClienteHandler) RegistrarFalta(c *fiber.Ctx) error {
    if err := infra.Wait(context.Background()); err != nil {
        return c.Status(429).JSON(fiber.Map{"error": "Too Many Requests"})
    }

    var req domain.FaltaAtendimentoRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "corpo da requisição inválido"})
    }

    if req.AgendamentoID <= 0 {
        return c.Status(400).JSON(fiber.Map{"error": "agendamento_id inválido"})
    }

    err := h.service.RegistrarFalta(req.AgendamentoID)
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(fiber.Map{"status": "falta_registrada"})
}
