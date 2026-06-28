import React from 'react'

const niveis = [
  { id: 1, nome: 'Corte Iniciante', xp: 100, bonus: '-', icon: '🌱' },
  { id: 2, nome: 'Barba de Respeito', xp: 300, bonus: '5% de desconto', icon: '' },
  { id: 3, nome: 'Lenda da Navalha', xp: 600, bonus: '10% de desconto', icon: '' },
  { id: 4, nome: 'Rei da Cadeira', xp: 1000, bonus: '1 Corte Grátis', icon: '👑' },
]

export default function NiveisPage() {
  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h2>Níveis RPG</h2>
        <p>Sistema de gamificação — Níveis e recompensas</p>
      </div>
      <div className="niveis-grid">
        {niveis.map(n => (
          <div key={n.id} className="nivel-card">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{n.icon}</div>
            <div className="nivel-number">{n.id}</div>
            <div className="nivel-name">{n.nome}</div>
            <div className="nivel-xp">{n.xp} XP necessários</div>
            {n.bonus !== '-' && <div className="nivel-bonus">🎁 {n.bonus}</div>}
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h3>📖 Como funciona a Gamificação</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>1. Acumule XP</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cada serviço realizado concede pontos de experiência (XP) ao cliente.</p>
          </div>
          <div>
            <h4 style={{ color: 'var(--gold)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>2. Suba de Nível</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ao atingir o XP necessário, o cliente sobe automaticamente de nível.</p>
          </div>
          <div>
            <h4 style={{ color: 'var(--green)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>3. Ganhe Recompensas</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cada nível desbloqueia bônus exclusivos como descontos e serviços grátis.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
