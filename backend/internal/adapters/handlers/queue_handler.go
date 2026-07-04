package handlers

import (
	"bufio"
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/valyala/fasthttp"
	"ruivobarber-api/internal/core/services"
)

type QueueHandler struct {
	service *services.QueueService
	sseHub  *services.SSEHub
}

func NewQueueHandler(service *services.QueueService, sseHub *services.SSEHub) *QueueHandler {
	return &QueueHandler{service: service, sseHub: sseHub}
}

func (h *QueueHandler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api/v1")

	// Rotas restritas a Admins e Barbeiros
	api.Post("/atendimentos/:id/checkin", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.RegistrarCheckIn)
	api.Post("/atendimentos/:id/em-cadeira", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.RegistrarEmCadeira)
	api.Get("/atendimentos/metricas", JWTMiddleware, RequireCargo("Adm", "Barbeiro"), h.ObterMetricas)

	// Rota SSE
	api.Get("/barbeiro/notificacoes", JWTMiddleware, RequireCargo("Barbeiro"), h.SSEBarbeiro)
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

func (h *QueueHandler) SSEBarbeiro(c *fiber.Ctx) error {
	barbeiroID := c.Locals("userId").(int)

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	c.Context().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
		ch := make(chan string)
		h.sseHub.Subscribe(barbeiroID, ch)
		defer h.sseHub.Unsubscribe(barbeiroID, ch)

		for {
			event, ok := <-ch
			if !ok {
				break
			}
			fmt.Fprintf(w, "data: %s\n\n", event)
			if err := w.Flush(); err != nil {
				// Cliente desconectou
				break
			}
		}
	}))

	return nil
}
