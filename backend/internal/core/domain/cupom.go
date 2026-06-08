package domain

import "time"

type ResgatarCupomRequest struct {
    ClienteID int `json:"cliente_id"`
    NivelID   int `json:"nivel_id"`
}

type Cupom struct {
    ID              int       `json:"id"`
    Codigo          string    `json:"codigo"`
    Descricao       string    `json:"descricao"`
    DescontoPercent float64   `json:"desconto_percent"`
    ClienteID       int       `json:"cliente_id"`
    Usado           bool      `json:"usado"`
    ValidoAte       time.Time `json:"valido_ate"`
}
