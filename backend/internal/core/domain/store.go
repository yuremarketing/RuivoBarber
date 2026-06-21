package domain

import "time"

type StoreItem struct {
	ID         int       `json:"id"`
	Nome       string    `json:"nome"`
	Descricao  string    `json:"descricao"`
	Preco      int       `json:"preco"`
	TipoItem   string    `json:"tipoItem"` // "Moldura", "Background", "Efeito"
	StyleClass string    `json:"styleClass"`
	CriadoEm   time.Time `json:"criadoEm"`
	Comprado   bool      `json:"comprado"`
	Equipado   bool      `json:"equipado"`
}
