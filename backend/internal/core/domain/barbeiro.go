package domain

type Barbeiro struct {
	ID             int     `json:"id"`
	Nome           string  `json:"nome"`
	FotoURL        string  `json:"foto_url"`
	AvaliacaoMedia float64 `json:"avaliacao_media"`
	ChavePix       string  `json:"chave_pix"`
}

type BarbeiroDisponibilidade struct {
	ID         int    `json:"id"`
	BarbeiroID int    `json:"barbeiro_id"`
	DiaSemana  int    `json:"dia_semana"` // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
	Trabalha   bool   `json:"trabalha"`
	HoraInicio string `json:"hora_inicio"` // "HH:MM"
	HoraFim    string `json:"hora_fim"`    // "HH:MM"
}

type BarbeiroBloqueio struct {
	ID           int     `json:"id"`
	BarbeiroID   int     `json:"barbeiro_id"`
	DataBloqueio string  `json:"data_bloqueio"` // "YYYY-MM-DD"
	HoraInicio   *string `json:"hora_inicio"`   // "HH:MM" (opcional)
	HoraFim      *string `json:"hora_fim"`      // "HH:MM" (opcional)
	Motivo       string  `json:"motivo"`
}

