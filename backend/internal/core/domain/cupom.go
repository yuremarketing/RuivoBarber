package domain

import "time"

type ResgatarCupomRequest struct {
	ClienteID int `json:"cliente_id"`
	NivelID   int `json:"nivel_id"`
}

type ValidarCupomRequest struct {
	Codigo string `json:"codigo"`
}

type Cupom struct {
	ID              int       `json:"id"`
	Codigo          string    `json:"codigo"`
	Descricao       string    `json:"descricao"`
	DescontoPercent float64   `json:"descontoPercent"`
	ClienteID       int       `json:"clienteId"`
	Usado           bool      `json:"usado"`
	ValidoAte       time.Time `json:"validoAte"`
}
