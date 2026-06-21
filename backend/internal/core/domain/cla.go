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

type ClaMensagem struct {
	ID        int       `json:"id"`
	ClaID     int       `json:"claId"`
	UsuarioID int       `json:"usuarioId"`
	Mensagem  string    `json:"mensagem"`
	CriadoEm  time.Time `json:"criadoEm"`
}

type ClaMensagemDTO struct {
	ID          int       `json:"id"`
	UsuarioID   int       `json:"usuarioId"`
	NomeUsuario string    `json:"nomeUsuario"`
	Mensagem    string    `json:"mensagem"`
	CriadoEm    time.Time `json:"criadoEm"`
}

type ClaRankingDTO struct {
	ID          int       `json:"id"`
	Nome        string    `json:"nome"`
	Descricao   string    `json:"descricao"`
	XPColetivo  int       `json:"xpColetivo"`
	NivelAtual  int       `json:"nivelAtual"`
	LiderID     int       `json:"liderId"`
	NomeLider   string    `json:"nomeLider"`
	MembrosQtd  int       `json:"membrosQtd"`
	CriadoEm    time.Time `json:"criadoEm"`
}

type JogadorBuscaDTO struct {
	ID    int    `json:"id"`
	Nome  string `json:"nome"`
	Login string `json:"login"`
}
