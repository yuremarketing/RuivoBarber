package domain

import "time"

type Temporada struct {
	ID         int       `json:"id"`
	Nome       string    `json:"nome"`
	DataInicio time.Time `json:"dataInicio"`
	DataFim    time.Time `json:"dataFim"`
	Ativa      bool      `json:"ativa"`
	CriadaEm   time.Time `json:"criadaEm"`
}
