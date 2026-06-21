package domain

import "time"

type Badge struct {
	ID             int        `json:"id"`
	Nome           string     `json:"nome"`
	Descricao      string     `json:"descricao"`
	IconeURL       string     `json:"iconeUrl"`
	RequisitoTipo  string     `json:"requisitoTipo"`
	RequisitoValor int        `json:"requisitoValor"`
	XpBonus        int        `json:"xpBonus"`
	CriadoEm       time.Time  `json:"criadoEm"`
	Desbloqueada   bool       `json:"desbloqueada"`
	DesbloqueadaEm *time.Time `json:"desbloqueadaEm"`
}
