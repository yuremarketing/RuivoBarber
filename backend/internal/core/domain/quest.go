package domain

import "time"

type ClanQuest struct {
	ID            int       `json:"id"`
	Descricao     string    `json:"descricao"`
	Meta          int       `json:"meta"`
	TipoRequisito string    `json:"tipoRequisito"`
	XpBonus       int       `json:"xpBonus"`
	CriadoEm      time.Time `json:"criadoEm"`
}

type ClanQuestProgress struct {
	QuestID       int       `json:"questId"`
	Descricao     string    `json:"descricao"`
	Meta          int       `json:"meta"`
	TipoRequisito string    `json:"tipoRequisito"`
	XpBonus       int       `json:"xpBonus"`
	Progresso     int       `json:"progresso"`
	Completada    bool      `json:"completada"`
	CompletadaEm  *time.Time `json:"completadaEm,omitempty"`
}
