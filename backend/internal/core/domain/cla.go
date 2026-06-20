package domain

import "time"

type Cla struct {
	ID         int       `json:"id"`
	Nome       string    `json:"nome"`
	Descricao  string    `json:"descricao"`
	XPColetivo int       `json:"xpColetivo"`
	NivelAtual int       `json:"nivelAtual"`
	LiderID    int       `json:"liderId"`
	CriadoEm   time.Time `json:"criadoEm"`
}

type ClaMembro struct {
	UsuarioID   int       `json:"usuarioId"`
	ClaID       int       `json:"claId"`
	Cargo       string    `json:"cargo"` // "Lider", "ViceLider", "Membro"
	DataEntrada time.Time `json:"dataEntrada"`
}

type ClaConviteDTO struct {
	ID         int       `json:"id"`
	ClaID      int       `json:"claId"`
	NomeCla    string    `json:"nomeCla"`
	EnviadoPor string    `json:"enviadoPor"`
	CriadoEm   time.Time `json:"criadoEm"`
}
