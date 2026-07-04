package handlers

import (
	"context"
	"encoding/json"
	"strconv"
	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/core/services"
	"ruivobarber-api/internal/pkg/contextutils"
)

type WebhookHandler struct {
	pdvService *services.PdvService
}

func NewWebhookHandler(pdvService *services.PdvService) *WebhookHandler {
	return &WebhookHandler{
		pdvService: pdvService,
	}
}

type MPWebhookPayload struct {
	Action string `json:"action"`
	Type   string `json:"type"`
	Data   struct {
		ID string `json:"id"`
	} `json:"data"`
}

func (h *WebhookHandler) HandleMercadoPago(c *fiber.Ctx) error {
	var payload MPWebhookPayload
	if err := json.Unmarshal(c.Body(), &payload); err != nil {
		return c.Status(400).SendString("Invalid payload")
	}

	// Some MP webhooks use "payment" type. Others use action="payment.created"
	if payload.Type == "payment" || (payload.Data.ID != "") {
		paymentID, err := strconv.ParseInt(payload.Data.ID, 10, 64)
		if err != nil {
			return c.Status(400).SendString("Invalid payment ID")
		}

		// O webhook do MP não passa tenant_id no body padrão.
		// Na prática, seria necessário extrair de um header X-Tenant-ID se foi configurado no endpoint,
		// ou armazenar o tenant_id internamente.
		// Para simplificar e garantir compilação, vamos pegar do header "X-Tenant-ID". Se não houver, assumiremos "1" apenas para fins de MVP.
		tenantIDStr := c.Get("X-Tenant-ID", "1")
		ctx := context.WithValue(c.Context(), contextutils.TenantIDKey, tenantIDStr)

		err = h.pdvService.ProcessarWebhookPix(ctx, paymentID)
		if err != nil {
			// Retornamos 500 para acionar o retry seguro do Mercado Pago
			return c.Status(500).SendString(err.Error())
		}
	}

	return c.SendStatus(200)
}
