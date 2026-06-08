import React from 'react'

const stats = [
  { icon: '👥', label: 'Total Clientes', value: '47', change: '+5 este mês' },
  { icon: '📅', label: 'Agendamentos Hoje', value: '12', change: '3 pendentes' },
  { icon: '💰', label: 'Receita do Mês', value: 'R$ 4.280', change: '+18% vs anterior' },
  { icon: '🎟️', label: 'Cupons Ativos', value: '8', change: '2 resgatados hoje' },
]

const agendamentos = [
  { id: 1, cliente: 'João Silva', servico: 'Corte + Barba', barbeiro: 'Carlos', horario: '10:00', status: 'Confirmado' },
  { id: 2, cliente: 'Pedro Santos', servico: 'Corte Simples', barbeiro: 'Ricardo', horario: '11:30', status: 'Pendente' },
  { id: 3, cliente: 'André Costa', servico: 'Barba Completa', barbeiro: 'Carlos', horario: '14:00', status: 'Pendente' },
  { id: 4, cliente: 'Marcos Oliveira', servico: 'Hidratação Capilar', barbeiro: 'Ricardo', horario: '15:30', status: 'Confirmado' },
  { id: 5, cliente: 'Lucas Ferreira', servico: 'Corte + Barba', barbeiro: 'Carlos', horario: '16:00', status: 'Concluido' },
]

const topClientes = [
  { nome: 'João Silva', nivel: 'Barba de Respeito', xp: 320, max: 600 },
  { nome: 'Pedro Santos', nivel: 'Lenda da Navalha', xp: 580, max: 600 },
  { nome: 'André Costa', nivel: 'Corte Iniciante', xp: 75, max: 100 },
]

export default function DashboardPage() {
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h2>📊 Dashboard</h2>
        <p>Visão geral do RuivoBarber — {hoje}</p>
      </div>
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="icon">{s.icon}</div>
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
            <div className="change">{s.change}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>📅 Agendamentos de Hoje</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{agendamentos.length} total</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Cliente</th><th>Serviço</th><th>Barbeiro</th><th>Hora</th><th>Status</th></tr></thead>
              <tbody>
                {agendamentos.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.cliente}</td>
                    <td>{a.servico}</td>
                    <td>{a.barbeiro}</td>
                    <td><strong>{a.horario}</strong></td>
                    <td><span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>⚔️ Top Clientes RPG</h3>
          </div>
          {topClientes.map((c, i) => (
            <div key={i} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>{c.nome}</strong>
                  <span className="rpg-level-badge" style={{ marginLeft: '0.5rem', fontSize: '0.6rem' }}>{c.nivel}</span>
                </div>
                <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.85rem' }}>{c.xp} / {c.max} XP</span>
              </div>
              <div className="xp-bar">
                <div className="xp-bar-fill" style={{ width: `${(c.xp / c.max * 100).toFixed(0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
