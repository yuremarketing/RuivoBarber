package domain

type Servico struct {
	ID             int     `json:"id"`
	Nome           string  `json:"nome"`
	Preco          float64 `json:"preco"`
	XpRecompensa   int     `json:"xpRecompensa"`
	DuracaoMinutos int     `json:"duracaoMinutos"`
}
