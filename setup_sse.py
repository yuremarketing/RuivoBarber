import os

# 1. Create SSE Handler and Hub
os.makedirs("backend/internal/adapters/handlers", exist_ok=True)
sse_content = '''package handlers

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
			formattedMsg := []byte(fmt.Sprintf("event: %s\\ndata: %s\\n\\n", event.Type, msg))

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
			formattedMsg := []byte("event: heartbeat\\ndata: ping\\n\\n")
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
			select {
			case msg, ok := <-client.Channel:
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
			case <-c.Context().Done():
				// Client disconnected
				return
			}
		}
	})

	return nil
}

func (h *SSEHandler) RegisterRoutes(app *fiber.App) {
	app.Get("/api/v1/stream", h.HandleStream)
}
'''
with open("backend/internal/adapters/handlers/sse_handler.go", "w") as f:
    f.write(sse_content)


# 2. Update worker/rpg_processor.go to receive the hub and broadcast
path_worker = 'backend/cmd/worker/rpg_processor.go'
with open(path_worker, 'r') as f:
    worker_content = f.read()

# Add hub to processor
worker_content = worker_content.replace('type RPGProcessor struct {\n\tdb *sql.DB\n\twg sync.WaitGroup\n}', 'type RPGProcessor struct {\n\tdb *sql.DB\n\twg sync.WaitGroup\n\tSseHub interface{}\n}')

# Wait, instead of interface, let's use a function or define an interface
# But worker is in cmd/worker, handlers in internal/adapters/handlers. We don't want circular deps.
# Let's create an interface in worker package.
worker_interface = '''type SSEBroadcaster interface {
	BroadcastEvent(tenantID, userID, eventType string, payload interface{})
}

type RPGProcessor struct {
	db          *sql.DB
	wg          sync.WaitGroup
	broadcaster SSEBroadcaster
}

func NewRPGProcessor(db *sql.DB, b SSEBroadcaster) *RPGProcessor {
	return &RPGProcessor{db: db, broadcaster: b}
}'''

worker_content = worker_content.replace('''type RPGProcessor struct {
	db *sql.DB
	wg sync.WaitGroup
}

func NewRPGProcessor(db *sql.DB) *RPGProcessor {
	return &RPGProcessor{db: db}
}''', worker_interface)

# In processEvent, broadcast XP_GRANTED
broadcast_logic = '''
	if p.broadcaster != nil {
		p.broadcaster.BroadcastEvent(fmt.Sprintf("%d", tenantID), fmt.Sprintf("%d", clienteID), "XP_GRANTED", map[string]interface{}{
			"xp": xpConcedido,
			"venda_id": vendaID,
		})
	}

	return nil
}'''
worker_content = worker_content.replace('''	return nil\n}''', broadcast_logic)
# need to make sure we only replace the last `return nil\n}`
# A bit tricky with replace. Let's do a strict replace
worker_content = worker_content.replace('''	if err != nil {
		return fmt.Errorf("erro ao inserir histórico xp: %w", err)
	}

	return nil
}''', '''	if err != nil {
		return fmt.Errorf("erro ao inserir histórico xp: %w", err)
	}

	if p.broadcaster != nil {
		p.broadcaster.BroadcastEvent(fmt.Sprintf("%d", tenantID), fmt.Sprintf("%d", clienteID), "XP_GRANTED", map[string]interface{}{
			"xp": xpConcedido,
			"venda_id": vendaID,
		})
	}

	return nil
}''')


with open(path_worker, 'w') as f:
    f.write(worker_content)


# 3. Update main.go to inject hub to worker and register sse handler
path_main = 'backend/cmd/api/main.go'
with open(path_main, 'r') as f:
    main_content = f.read()

# Hub Wrapper to implement SSEBroadcaster
hub_wrapper = '''
type HubWrapper struct {
	hub *handlers.SSEHub
}

func (w *HubWrapper) BroadcastEvent(tenantID, userID, eventType string, payload interface{}) {
	w.hub.Broadcast <- handlers.SSEEvent{
		TenantID: tenantID,
		UserID:   userID,
		Type:     eventType,
		Payload:  payload,
	}
}
'''
main_content = main_content.replace('func main() {', hub_wrapper + '\nfunc main() {')

# Find worker init and replace
worker_init_old = '''	// Start RPG Worker with Graceful Shutdown context
	workerCtx, workerCancel := context.WithCancel(context.Background())
	rpgWorker := worker.NewRPGProcessor(db)
	rpgWorker.Start(workerCtx)'''

worker_init_new = '''	// Setup SSE Hub
	sseHub := handlers.NewSSEHub()
	go sseHub.Run()
	sseHandler := handlers.NewSSEHandler(sseHub)
	broadcaster := &HubWrapper{hub: sseHub}

	// Start RPG Worker with Graceful Shutdown context
	workerCtx, workerCancel := context.WithCancel(context.Background())
	rpgWorker := worker.NewRPGProcessor(db, broadcaster)
	rpgWorker.Start(workerCtx)'''

main_content = main_content.replace(worker_init_old, worker_init_new)

# Register SSE Routes
if 'sseHandler.RegisterRoutes(app)' not in main_content:
    main_content = main_content.replace('dashboardHandler.RegisterRoutes(app)', 'dashboardHandler.RegisterRoutes(app)\n    sseHandler.RegisterRoutes(app)')


with open(path_main, 'w') as f:
    f.write(main_content)

print("SSE setup complete")
