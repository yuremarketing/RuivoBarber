import React, { useState } from 'react'
import AdminValidationPanel from '../components/AdminValidationPanel.jsx'

const mockCupons = [
  { id: 1, codigo: 'BEMVINDO10', descricao: '10% de desconto para novos clientes', desconto: 10, cliente: 'João Silva', usado: false, validade: '2025-02-28' },
  { id: 2, codigo: 'FIDELIDADE20', descricao: '20% off por fidelidade', desconto: 20, cliente: 'Pedro Santos', usado: true, validade: '2025-01-20' },
  { id: 3, codigo: 'ANIVERSARIO', descricao: 'Corte grátis de aniversário', desconto: 100, cliente: 'André Costa', usado: false, validade: '2025-03-15' },
  { id: 4, codigo: 'NATAL2024', descricao: 'Promoção de Natal 15% off', desconto: 15, cliente: 'Marcos Oliveira', usado: true, validade: '2024-12-31' },
  { id: 5, codigo: 'RPG-NIVEL4', descricao: 'Bônus Rei da Cadeira: 1 corte grátis', desconto: 100, cliente: 'Lucas Ferreira', usado: false, validade: '2025-06-30' },
]

export default function CuponsPage() {
  const [showModal, setShowModal] = useState(false)
  const hoje = new Date().toISOString().split('T')[0]
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Administrador","cargo":"Adm"}')
  const isAdmin = user.cargo === 'Adm' || user.cargo === 'Barbeiro'

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>Cupons</h2>
            <p>{isAdmin ? 'Gestão de cupons de desconto e validação' : 'Seus cupons de desconto e recompensas RPG'}</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Cupom</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'start' }}>
        <div style={{ flex: '2', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', width: '100%', marginBottom: 0 }}>
            <div className="stat-card"><div className="icon"></div><div className="value">{mockCupons.length}</div><div className="label">Total Cupons</div></div>
            <div className="stat-card"><div className="icon">✅</div><div className="value">{mockCupons.filter(c => !c.usado && c.validade >= hoje).length}</div><div className="label">Ativos</div></div>
            <div className="stat-card"><div className="icon">📋</div><div className="value">{mockCupons.filter(c => c.usado).length}</div><div className="label">Utilizados</div></div>
          </div>
          
          <div className="card">
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Código</th><th>Descrição</th><th>Desconto</th><th>Cliente</th><th>Validade</th><th>Status</th>{isAdmin && <th>Ações</th>}</tr></thead>
                <tbody>
                  {mockCupons.map(c => {
                    const expirado = c.validade < hoje
                    const statusClass = c.usado ? 'badge-usado' : expirado ? 'badge-cancelado' : 'badge-ativo'
                    const statusLabel = c.usado ? 'Usado' : expirado ? 'Expirado' : 'Ativo'
                    return (
                      <tr key={c.id}>
                        <td><code style={{ background: 'var(--bg-input)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold)' }}>{c.codigo}</code></td>
                        <td style={{ maxWidth: '250px' }}>{c.descricao}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{c.desconto}%</td>
                        <td>{c.cliente}</td>
                        <td>{new Date(c.validade + 'T00:00').toLocaleDateString('pt-BR')}</td>
                        <td><span className={`badge ${statusClass}`}>{statusLabel}</span></td>
                        {isAdmin && (
                          <td>
                            <button className="btn btn-ghost btn-sm" title="Editar">✏️</button>
                            <button className="btn btn-ghost btn-sm" title="Remover">🗑️</button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
            <AdminValidationPanel />
          </div>
        )}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Novo Cupom</h3>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Código</label>
                <input type="text" className="form-input" placeholder="Ex: PROMO20" style={{ textTransform: 'uppercase' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Desconto (%)</label>
                <input type="number" className="form-input" placeholder="10" min="1" max="100" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input type="text" className="form-input" placeholder="Descrição do cupom" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cliente (opcional)</label>
                <select className="form-input"><option value="">Todos os clientes</option><option>João Silva</option><option>Pedro Santos</option></select>
              </div>
              <div className="form-group">
                <label className="form-label">Válido até</label>
                <input type="date" className="form-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>Criar Cupom</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
