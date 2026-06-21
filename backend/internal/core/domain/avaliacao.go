package domain

import "time"

type Avaliacao struct {
	ID            int       `json:"id"`
	AgendamentoID int       `json:"agendamento_id"`
	ClienteID     int       `json:"cliente_id"`
	BarbeiroID    int       `json:"barbeiro_id"`
	Nota          int       `json:"nota"`
	Comentario    string    `json:"comentario"`
	CriadoEm      time.Time `json:"criado_em"`
}

type UltimoCorteResponse struct {
	AgendamentoID     int       `json:"agendamento_id"`
	DataHora          time.Time `json:"data_hora"`
	BarbeiroID        int       `json:"barbeiro_id"`
	BarbeiroNome      string    `json:"barbeiro_nome"`
	ServicoNome       string    `json:"servico_nome"`
	AvaliacaoPendente bool      `json:"avaliacao_pendente"`
}
