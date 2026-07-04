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
            <div className="niveis-page-icon">{n.icon}</div>
            <div className="nivel-number">{n.id}</div>
            <div className="nivel-name">{n.nome}</div>
            <div className="nivel-xp">{n.xp} XP necessários</div>
            {n.bonus !== '-' && <div className="nivel-bonus">🎁 {n.bonus}</div>}
          </div>
        ))}
      </div>
      <div className="card niveis-page-info-card">
        <div className="card-header">
          <h3>📖 Como funciona a Gamificação</h3>
        </div>
        <div className="niveis-page-steps-grid">
          <div>
            <h4 className="niveis-page-step-title-1">1. Acumule XP</h4>
            <p className="text-secondary text-sm">Cada serviço realizado concede pontos de experiência (XP) ao cliente.</p>
          </div>
          <div>
            <h4 className="niveis-page-step-title-2">2. Suba de Nível</h4>
            <p className="text-secondary text-sm">Ao atingir o XP necessário, o cliente sobe automaticamente de nível.</p>
          </div>
          <div>
            <h4 className="niveis-page-step-title-3">3. Ganhe Recompensas</h4>
            <p className="text-secondary text-sm">Cada nível desbloqueia bônus exclusivos como descontos e serviços grátis.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
