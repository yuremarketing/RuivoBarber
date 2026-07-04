package handlers

import (
	"ruivobarber-api/internal/core/domain"
	"ruivobarber-api/internal/core/services"

	"github.com/gofiber/fiber/v2"
)

type RelatoriosHandler struct {
	service *services.RelatoriosService
}

func NewRelatoriosHandler(service *services.RelatoriosService) *RelatoriosHandler {
	return &RelatoriosHandler{service: service}
}

func (h *RelatoriosHandler) RegisterRoutes(app *fiber.App) {
	relatorioGroup := app.Group("/api/v1/relatorios", JWTMiddleware)
	relatorioGroup.Get("/comissoes", RequireCargo("Adm"), h.ObterComissoes)
}

func (h *RelatoriosHandler) ObterComissoes(c *fiber.Ctx) error {
	dataInicio := c.Query("inicio")
	dataFim := c.Query("fim")

	if dataInicio == "" || dataFim == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Parâmetros 'inicio' e 'fim' são obrigatórios (formato YYYY-MM-DD)"})
	}

	resumo, err := h.service.ObterResumoComissoes(c.Context(), dataInicio, dataFim)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if resumo.ComissoesPorBarbeiro == nil {
		resumo.ComissoesPorBarbeiro = []domain.RelatorioComissao{}
	}

	return c.JSON(resumo)
}
