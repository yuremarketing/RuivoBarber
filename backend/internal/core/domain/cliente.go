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
	Moedas          int     `json:"moedas"`
	MolduraEquipada string  `json:"molduraEquipada"`
	FundoEquipado   string  `json:"fundoEquipado"`
	EfeitoEquipado  string  `json:"efeitoEquipado"`
	WhatsappConsent bool    `json:"whatsappConsent"`
	Telefone        string  `json:"telefone"`
}

type Configuracoes struct {
	ID               int    `json:"id"`
	ChaveAPIWhatsApp string `json:"chaveApiWhatsapp"`
	UrlWebhook       string `json:"urlWebhook"`
	TokenValidacao   string `json:"tokenValidacao"`
	AceitaDinheiro   bool   `json:"aceitaDinheiro"`
	AceitaPix        bool   `json:"aceitaPix"`
	AceitaCartao     bool   `json:"aceitaCartao"`
	ChavePix         string `json:"chavePix"`
	MercadoPagoToken string `json:"mercadoPagoToken"`
}
