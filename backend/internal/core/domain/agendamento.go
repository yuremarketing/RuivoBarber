package domain

import "time"

type Servico struct {
	ID             int     `json:"id"`
	Nome           string  `json:"nome"`
	Preco          float64 `json:"preco"`
	XpRecompensa   int     `json:"xp_recompensa"`
	DuracaoMinutos int     `json:"duracao_minutos"`
}

type Barbeiro struct {
	ID   int    `json:"id"`
	Nome string `json:"nome"`
}

type Agendamento struct {
	ID           int       `json:"id"`
	ClienteID    int       `json:"cliente_id"`
	ClienteNome  string    `json:"cliente_nome,omitempty"`
	BarbeiroID   int       `json:"barbeiro_id"`
	BarbeiroNome string    `json:"barbeiro_nome,omitempty"`
	ServicoID    int       `json:"servico_id"`
	ServicoNome  string    `json:"servico_nome,omitempty"`
	DataHora     time.Time `json:"data_hora"`
	Status       string    `json:"status"`
}
