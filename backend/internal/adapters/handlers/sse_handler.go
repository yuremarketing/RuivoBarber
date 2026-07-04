package handlers

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"ruivobarber-api/internal/pkg/contextutils"
)

type SSEClient struct {
	TenantID string
	UserID   string
	Channel  chan []byte
}

type SSEHub struct {
	clients    map[*SSEClient]bool
	Broadcast  chan SSEEvent
	Register   chan *SSEClient
	Unregister chan *SSEClient
	mu         sync.RWMutex
}

type SSEEvent struct {
	TenantID string      `json:"tenant_id"`
	UserID   string      `json:"user_id"`
	Type     string      `json:"type"`
	Payload  interface{} `json:"payload"`
}

func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients:    make(map[*SSEClient]bool),
		Broadcast:  make(chan SSEEvent, 100),
		Register:   make(chan *SSEClient),
		Unregister: make(chan *SSEClient),
	}
}

func (h *SSEHub) Run() {
	heartbeatTicker := time.NewTicker(30 * time.Second)
	defer heartbeatTicker.Stop()

	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("[SSE] Client registered. Tenant: %s, User: %s", client.TenantID, client.UserID)
		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Channel)
			}
			h.mu.Unlock()
			log.Printf("[SSE] Client unregistered. Tenant: %s, User: %s", client.TenantID, client.UserID)
		case event := <-h.Broadcast:
			msg, err := json.Marshal(event.Payload)
			if err != nil {
				continue
			}
			formattedMsg := []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", event.Type, msg))

			h.mu.RLock()
			for client := range h.clients {
				// Broadcast to all clients of the same tenant, and same user if user_id is provided
				if client.TenantID == event.TenantID && (event.UserID == "" || client.UserID == event.UserID) {
					select {
					case client.Channel <- formattedMsg:
					default:
						// If channel is full, we don't block. We could disconnect the client here.
					}
				}
			}
			h.mu.RUnlock()
		case <-heartbeatTicker.C:
			formattedMsg := []byte("event: heartbeat\ndata: ping\n\n")
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Channel <- formattedMsg:
				default:
				}
			}
			h.mu.RUnlock()
		}
	}
}

type SSEHandler struct {
	Hub *SSEHub
}

func NewSSEHandler(hub *SSEHub) *SSEHandler {
	return &SSEHandler{Hub: hub}
}

func (h *SSEHandler) HandleStream(c *fiber.Ctx) error {
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	// Get TenantID from contextutils if available (assuming middleware sets it) or headers
	tenantID, _ := contextutils.GetTenantID(c.Context())
	if tenantID == "" {
		tenantID = c.Get("X-Tenant-ID", "1")
	}
	
	// Try to get UserID. For now, checking query param. In production, get from JWT context.
	userID := c.Query("user_id", "")

	client := &SSEClient{
		TenantID: tenantID,
		UserID:   userID,
		Channel:  make(chan []byte, 20),
	}

	h.Hub.Register <- client

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		// Detect disconnection
		defer func() {
			h.Hub.Unregister <- client
		}()

		for {
			msg, ok := <-client.Channel
			if !ok {
				return
			}
			_, err := w.Write(msg)
			if err != nil {
				return
			}
			err = w.Flush()
			if err != nil {
				return
			}
		}
	})

	return nil
}

func (h *SSEHandler) RegisterRoutes(app *fiber.App) {
	app.Get("/api/v1/stream", h.HandleStream)
}
