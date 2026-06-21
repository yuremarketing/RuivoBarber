package domain

import "time"

type Live struct {
	ID         int       `json:"id"`
	Titulo     string    `json:"titulo"`
	Url        string    `json:"url"`
	Plataforma string    `json:"plataforma"`
	Ativa      bool      `json:"ativa"`
	CriadoEm   time.Time `json:"criadoEm"`
}
