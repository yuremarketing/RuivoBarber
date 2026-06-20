package domain

type Cliente struct {
	ID              int     `json:"id"`
	Nome            string  `json:"nome"`
	Login           string  `json:"login"`
	Cargo           string  `json:"cargo"`
	XP              int     `json:"xp"`
	Nivel           int     `json:"nivel"`
	BarraPercentual float64 `json:"barraPercentual"`
	NomeDoNivel     string  `json:"nomeDoNivel"`
	AvatarURL       string  `json:"avatarUrl"`
}

type Configuracoes struct {
	ID               int    `json:"id"`
	ChaveAPIWhatsApp string `json:"chaveApiWhatsapp"`
	UrlWebhook       string `json:"urlWebhook"`
	TokenValidacao   string `json:"tokenValidacao"`
}
