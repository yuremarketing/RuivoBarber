package domain

type ConcluirAtendimentoRequest struct {
    AgendamentoID int `json:"agendamento_id"`
}

type FaltaAtendimentoRequest struct {
    AgendamentoID int `json:"agendamento_id"`
}
