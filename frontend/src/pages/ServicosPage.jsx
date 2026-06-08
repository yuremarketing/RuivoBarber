import React, { useState } from 'react'

const servicos = [
  { id: 1, nome: 'Corte Simples', preco: 35, xp: 10, duracao: 30, icon: '✂️', desc: 'Corte masculino clássico com máquina e tesoura' },
  { id: 2, nome: 'Corte + Barba', preco: 60, xp: 25, duracao: 60, icon: '💈', desc: 'Combo completo: corte estilizado + barba na navalha' },
  { id: 3, nome: 'Barba Completa', preco: 40, xp: 15, duracao: 45, icon: '🧔', desc: 'Barba com toalha quente, navalha e hidratação' },
  { id: 4, nome: 'Hidratação Capilar', preco: 50, xp: 20, duracao: 40, icon: '💧', desc: 'Tratamento profundo para cabelos danificados' },
]

export default function ServicosPage() {
  const [showModal, setShowModal] = useState(false)
  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>✂️ Serviços</h2>
            <p>Catálogo de serviços e preços</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Serviço</button>
        </div>
      </div>
      <div className="services-grid">
        {servicos.map(s => (
          <div key={s.id} className="service-card">
            <div className="service-icon">{s.icon}</div>
            <div className="service-name">{s.nome}</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>{s.desc}</p>
            <div className="service-price">R$ {s.preco.toFixed(2)}</div>
            <div className="service-meta">
              <div className="service-meta-item">⏱️ <strong>{s.duracao}</strong> min</div>
              <div className="service-meta-item">⚔️ <strong style={{ color: 'var(--gold)' }}>+{s.xp} XP</strong></div>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}>✏️ Editar</button>
              <button className="btn btn-danger btn-sm">🗑️</button>
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✂️ Novo Serviço</h3>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Nome do Serviço</label>
              <input type="text" className="form-input" placeholder="Ex: Corte Degradê" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Preço (R$)</label>
                <input type="number" className="form-input" placeholder="0.00" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Duração (min)</label>
                <input type="number" className="form-input" placeholder="30" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">XP Recompensa</label>
              <input type="number" className="form-input" placeholder="10" />
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea className="form-input" placeholder="Descrição do serviço..." rows="3" style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>Salvar Serviço</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
