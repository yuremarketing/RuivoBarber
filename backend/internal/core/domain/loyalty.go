package domain

import "time"

type CheckInResponse struct {
	Message         string     `json:"message"`
	XpGanhado       int        `json:"xpGanhado"`
	MoedasGanhadas  int        `json:"moedasGanhadas"`
	StreakAtual     int        `json:"streakAtual"`
	NovoXp          int        `json:"novoXp"`
	NovoNivel       int        `json:"novoNivel"`
	BarraPercentual float64    `json:"barraPercentual"`
	UltimoCheckIn   *time.Time `json:"ultimoCheckIn"`
}
