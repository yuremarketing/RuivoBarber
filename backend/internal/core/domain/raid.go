package domain

import "time"

type Raid struct {
	ID               int       `json:"id"`
	Nome             string    `json:"nome"`
	Descricao        string    `json:"descricao"`
	Meta             int       `json:"meta"`
	Progresso        int       `json:"progresso"`
	TipoRequisito    string    `json:"tipoRequisito"`
	RecompensaXp     int       `json:"recompensaXp"`
	RecompensaMoedas int       `json:"recompensaMoedas"`
	DataInicio       time.Time `json:"dataInicio"`
	DataFim          time.Time `json:"dataFim"`
	Status           string    `json:"status"`
}

type RaidStatusResponse struct {
	Raid                 *Raid `json:"raid"`
	MinhaContribuicao    int   `json:"minhaContribuicao"`
	PodeResgatar         bool  `json:"podeResgatar"`
	RecompensaResgatada  bool  `json:"recompensaResgatada"`
}
