package domain

type DashboardStats struct {
	TotalClientes    int     `json:"total_clientes"`
	NovosClientesMes int     `json:"novos_clientes_mes"`
	AgendamentosHoje int     `json:"agendamentos_hoje"`
	PendentesHoje    int     `json:"pendentes_hoje"`
	ReceitaMes       float64 `json:"receita_mes"`
	PercentualMesAnt float64 `json:"percentual_mes_ant"`
	CuponsAtivos     int     `json:"cupons_ativos"`
	CuponsResgatados int     `json:"cupons_resgatados_hoje"`
}

type AgendamentoDashboard struct {
	ID       int    `json:"id"`
	Cliente  string `json:"cliente"`
	Servico  string `json:"servico"`
	Barbeiro string `json:"barbeiro"`
	Horario  string `json:"horario"`
	Status   string `json:"status"`
}

type DashboardData struct {
	Stats        DashboardStats         `json:"stats"`
	Agendamentos []AgendamentoDashboard `json:"agendamentos"`
}
