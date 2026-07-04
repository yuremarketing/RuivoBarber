package handlers

import (
	"context"
	"database/sql"
	"time"

	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/cmd/worker"
)

type OpsHandler struct {
	db     *sql.DB
	worker *worker.RPGProcessor
	sseHub *SSEHub
}

func NewOpsHandler(db *sql.DB, w *worker.RPGProcessor, sse *SSEHub) *OpsHandler {
	return &OpsHandler{db: db, worker: w, sseHub: sse}
}

func (h *OpsHandler) RegisterRoutes(app *fiber.App) {
	app.Get("/api/v1/ops/status", h.Status)
}

func (h *OpsHandler) Status(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	dbStatus := "healthy"
	if err := h.db.PingContext(ctx); err != nil {
		dbStatus = "unhealthy"
	}

	workerStatus := "unhealthy"
	if h.worker != nil && h.worker.IsHealthy() {
		workerStatus = "healthy"
	}

	sseStatus := "unhealthy"
	if h.sseHub != nil {
		sseStatus = "healthy"
	}

	overallStatus := "healthy"
	if dbStatus != "healthy" || workerStatus != "healthy" || sseStatus != "healthy" {
		overallStatus = "degraded"
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"api":       overallStatus,
		"database":  dbStatus,
		"worker":    workerStatus,
		"sse":       sseStatus,
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   "1.0.0", // Mock version
	})
}
