package services

import (
	"sync"
)

type SSEHub struct {
	mu          sync.RWMutex
	connections map[int][]chan string // mapeia BarbeiroID para uma lista de canais
}

func NewSSEHub() *SSEHub {
	return &SSEHub{
		connections: make(map[int][]chan string),
	}
}

func (h *SSEHub) Subscribe(barbeiroID int, ch chan string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.connections[barbeiroID] = append(h.connections[barbeiroID], ch)
}

func (h *SSEHub) Unsubscribe(barbeiroID int, ch chan string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	conns := h.connections[barbeiroID]
	for i, c := range conns {
		if c == ch {
			h.connections[barbeiroID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}
	close(ch) // Fechar o canal para evitar goroutine leaks
}

func (h *SSEHub) BroadcastToBarbeiro(barbeiroID int, eventData string) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	conns := h.connections[barbeiroID]
	for _, ch := range conns {
		// Non-blocking send para evitar travar se o cliente desconectar mal
		select {
		case ch <- eventData:
		default:
		}
	}
}
