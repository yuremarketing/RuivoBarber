package repositories

import (
	"database/sql"
	"ruivobarber-api/internal/core/domain"
	"time"
)

type dashboardPgRepository struct {
	db *sql.DB
}

func NewDashboardPgRepository(db *sql.DB) *dashboardPgRepository {
	return &dashboardPgRepository{db: db}
}

func (r *dashboardPgRepository) GetDashboardData() (*domain.DashboardData, error) {
	var data domain.DashboardData
	
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	startOfPrevMonth := startOfMonth.AddDate(0, -1, 0)
	
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.AddDate(0, 0, 1)

	// Total Clientes
	r.db.QueryRow("SELECT COUNT(*) FROM Usuarios WHERE Cargo = 'Cliente'").Scan(&data.Stats.TotalClientes)

	// Novos Clientes Mês
	r.db.QueryRow("SELECT COUNT(*) FROM Usuarios WHERE Cargo = 'Cliente' AND id > 0").Scan(&data.Stats.NovosClientesMes) // Simplificado: sem data_criacao em Usuarios

	// Agendamentos Hoje e Pendentes Hoje
	r.db.QueryRow("SELECT COUNT(*) FROM Agendamentos WHERE DataHora >= $1 AND DataHora < $2", startOfDay, endOfDay).Scan(&data.Stats.AgendamentosHoje)
	r.db.QueryRow("SELECT COUNT(*) FROM Agendamentos WHERE DataHora >= $1 AND DataHora < $2 AND Status = 'Pendente'", startOfDay, endOfDay).Scan(&data.Stats.PendentesHoje)

	// Receita Mês Atual (Aproximada com Agendamentos Concluídos * preço do serviço)
	r.db.QueryRow(`
		SELECT COALESCE(SUM(s.Preco), 0)
		FROM Agendamentos a
		JOIN Servicos s ON a.ServicoID = s.ID
		WHERE a.Status = 'Concluido' AND a.DataHora >= $1 AND a.DataHora < $2
	`, startOfMonth, now).Scan(&data.Stats.ReceitaMes)

	// Receita Mês Anterior
	var receitaMesAnt float64
	r.db.QueryRow(`
		SELECT COALESCE(SUM(s.Preco), 0)
		FROM Agendamentos a
		JOIN Servicos s ON a.ServicoID = s.ID
		WHERE a.Status = 'Concluido' AND a.DataHora >= $1 AND a.DataHora < $2
	`, startOfPrevMonth, startOfMonth).Scan(&receitaMesAnt)

	if receitaMesAnt > 0 {
		data.Stats.PercentualMesAnt = ((data.Stats.ReceitaMes - receitaMesAnt) / receitaMesAnt) * 100
	} else if data.Stats.ReceitaMes > 0 {
		data.Stats.PercentualMesAnt = 100
	}

	// Cupons
	r.db.QueryRow("SELECT COUNT(*) FROM Cupons WHERE Utilizado = false").Scan(&data.Stats.CuponsAtivos)
	r.db.QueryRow("SELECT COUNT(*) FROM Cupons WHERE Utilizado = true AND UtilizadoEm >= $1", startOfDay).Scan(&data.Stats.CuponsResgatados)

	// Agendamentos de Hoje (Lista)
	rows, err := r.db.Query(`
		SELECT a.ID, c.Nome AS Cliente, s.Nome AS Servico, b.Nome AS Barbeiro, TO_CHAR(a.DataHora, 'HH24:MI') AS Horario, a.Status
		FROM Agendamentos a
		JOIN Usuarios c ON a.ClienteID = c.ID
		JOIN Usuarios b ON a.BarbeiroID = b.ID
		JOIN Servicos s ON a.ServicoID = s.ID
		WHERE a.DataHora >= $1 AND a.DataHora < $2
		ORDER BY a.DataHora ASC
	`, startOfDay, endOfDay)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var ag domain.AgendamentoDashboard
			if err := rows.Scan(&ag.ID, &ag.Cliente, &ag.Servico, &ag.Barbeiro, &ag.Horario, &ag.Status); err == nil {
				data.Agendamentos = append(data.Agendamentos, ag)
			}
		}
	}

	if data.Agendamentos == nil {
		data.Agendamentos = []domain.AgendamentoDashboard{}
	}

	return &data, nil
}
