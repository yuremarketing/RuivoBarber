package domain

import "time"

type Agendamento struct {
	ID             int       `json:"id"`
	ClienteID      int       `json:"clienteId"`
	ClienteNome    string    `json:"clienteNome,omitempty"`
	BarbeiroID     int       `json:"barbeiroId"`
	BarbeiroNome   string    `json:"barbeiroNome,omitempty"`
	ServicoID      int       `json:"servicoId"`
	ServicoNome    string    `json:"servicoNome,omitempty"`
	DuracaoMinutos int       `json:"duracaoMinutos,omitempty"`
	DataHora       time.Time `json:"dataHora"`
	Status         string    `json:"status"`
	CriadoEm       time.Time `json:"criadoEm"`
}
type AgendaSlot struct {
	Time      string `json:"time"`
	Available bool   `json:"available"`
}
