package domain

type QueueMetrics struct {
	TempoMedioEsperaMinutos     float64 `json:"tempoMedioEsperaMinutos"`
	TempoMedioAtendimentoMinutos float64 `json:"tempoMedioAtendimentoMinutos"`
	TotalAtendimentosConcluidos  int     `json:"totalAtendimentosConcluidos"`
}
