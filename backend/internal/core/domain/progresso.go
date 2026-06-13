package domain

import "time"

type ProgressoCliente struct {
	ID              int       `json:"id"`
	ClienteID       int       `json:"clienteId"`
	XPAtual         int       `json:"xpAtual"`
	NivelAtual      int       `json:"nivelAtual"`
	BarraPercentual float64   `json:"barraPercentual"`
	UpdatedAt       time.Time `json:"updatedAt"`
}
