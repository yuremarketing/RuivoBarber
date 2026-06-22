package domain

import "time"

type Caixa struct {
	ID             int        `json:"id"`
	OperadorID     *int       `json:"operador_id"`
	SaldoInicial   float64    `json:"saldo_inicial"`
	SaldoFinal     *float64   `json:"saldo_final"`
	SaldoInformado *float64   `json:"saldo_informado"`
	Status         string     `json:"status"`
	AbertoEm       time.Time  `json:"aberto_em"`
	FechadoEm      *time.Time `json:"fechado_em"`
}

type MovimentacaoCaixa struct {
	ID       int       `json:"id"`
	CaixaID  int       `json:"caixa_id"`
	Tipo     string    `json:"tipo"`
	Valor    float64   `json:"valor"`
	Motivo   string    `json:"motivo"`
	CriadoEm time.Time `json:"criado_em"`
}
