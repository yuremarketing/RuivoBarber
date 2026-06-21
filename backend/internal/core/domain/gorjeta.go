package domain

import "time"

type Gorjeta struct {
	ID            int        `json:"id"`
	AgendamentoID *int       `json:"agendamento_id"`
	ClienteID     *int       `json:"cliente_id"`
	BarbeiroID    int        `json:"barbeiro_id"`
	Valor         float64    `json:"valor"`
	ChavePix      string     `json:"chave_pix"`
	PixCopiaECola string     `json:"pix_copia_e_cola"`
	QrCodeURL     string     `json:"qr_code_url"`
	Status        string     `json:"status"`
	CriadoEm      time.Time  `json:"criado_em"`
	PagoEm        *time.Time `json:"pago_em"`
}
