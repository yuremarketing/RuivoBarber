import React, { useState } from 'react'

const mockAgendamentos = [
  { id: 1, cliente: 'João Silva', barbeiro: 'Carlos Ruivo', servico: 'Corte + Barba', dataHora: '2025-01-15T10:00', status: 'Confirmado', preco: 60 },
  { id: 2, cliente: 'Pedro Santos', barbeiro: 'Ricardo Lima', servico: 'Corte Simples', dataHora: '2025-01-15T11:30', status: 'Pendente', preco: 35 },
  { id: 3, cliente: 'André Costa', barbeiro: 'Carlos Ruivo', servico: 'Barba Completa', dataHora: '2025-01-15T14:00', status: 'Pendente', preco: 40 },
  { id: 4, cliente: 'Marcos Oliveira', barbeiro: 'Ricardo Lima', servico: 'Hidratação Capilar', dataHora: '2025-01-15T15:30', status: 'Confirmado', preco: 50 },
  { id: 5, cliente: 'Lucas Ferreira', barbeiro: 'Carlos Ruivo', servico: 'Corte + Barba', dataHora: '2025-01-14T16:00', status: 'Concluido', preco: 60 },
  { id: 6, cliente: 'Rafael Mendes', barbeiro: 'Ricardo Lima', servico: 'Corte Simples', dataHora: '2025-01-14T09:00', status: 'Cancelado', preco: 35 },
]

export default function AgendamentosPage() {
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const statuses = ['Todos', 'Pendente', 'Confirmado', 'Concluido', 'Cancelado']
  const filtered = filtroStatus === 'Todos' ? mockAgendamentos : mockAgendamentos.filter(a => a.status === filtroStatus)

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>📅 Agendamentos</h2>
            <p>Gestão de horários e serviços</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Agendamento</button>
        </div>
      </div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[{ s: 'Pendente', v: 2, i: '⏳' },{ s: 'Confirmado', v: 2, i: '✅' },{ s: 'Concluido', v: 1, i: '🏁' },{ s: 'Cancelado', v: 1, i: '❌' }].map(x => (
          <div key={x.s} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setFiltroStatus(x.s)}>
            <div className="icon">{x.i}</div>
            <div className="value">{x.v}</div>
            <div className="label">{x.s}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {statuses.map(s => (
          <button key={s} className={`btn ${filtroStatus === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFiltroStatus(s)}>{s}</button>
        ))}
      </div>
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>ID</th><th>Cliente</th><th>Barbeiro</th><th>Serviço</th><th>Data/Hora</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td style={{ color: 'var(--text-muted)' }}>#{a.id}</td>
                  <td style={{ fontWeight: 600 }}>{a.cliente}</td>
                  <td>{a.barbeiro}</td>
                  <td>{a.servico}</td>
                  <td>{new Date(a.dataHora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ fontWeight: 600 }}>R$ {a.preco.toFixed(2)}</td>
                  <td><span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span></td>
                  <td>
                    {a.status === 'Pendente' && <button className="btn btn-ghost btn-sm" title="Confirmar">✅</button>}
                    {a.status === 'Confirmado' && <button className="btn btn-ghost btn-sm" title="Concluir">🏁</button>}
                    {(a.status === 'Pendente' || a.status === 'Confirmado') && <button className="btn btn-ghost btn-sm" title="Cancelar">❌</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Novo Agendamento</h3>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <select className="form-input"><option>João Silva</option><option>Pedro Santos</option><option>André Costa</option></select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Barbeiro</label>
                <select className="form-input"><option>Carlos Ruivo</option><option>Ricardo Lima</option></select>
              </div>
              <div className="form-group">
                <label className="form-label">Serviço</label>
                <select className="form-input"><option>Corte Simples - R$35</option><option>Corte + Barba - R$60</option><option>Barba Completa - R$40</option><option>Hidratação - R$50</option></select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Data</label>
                <input type="date" className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Hora</label>
                <input type="time" className="form-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>Agendar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
