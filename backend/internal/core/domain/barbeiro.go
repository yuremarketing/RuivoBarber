package domain

type Barbeiro struct {
	ID             int     `json:"id"`
	Nome           string  `json:"nome"`
	FotoURL        string  `json:"foto_url"`
	AvaliacaoMedia float64 `json:"avaliacao_media"`
}
