import React from 'react'

function PlayerCard({ nome, nivel, xp }) {
  return (
    <div style={{
      background: '#16213e',
      border: '2px solid #e94560',
      borderRadius: '12px',
      padding: '1.5rem',
      maxWidth: '400px',
      marginBottom: '1rem'
    }}>
      <h2 style={{ margin: 0, color: '#e94560' }}>👤 {nome}</h2>
      <p style={{ margin: '0.5rem 0', color: '#a8a8b3' }}>Nível: <strong style={{ color: '#fff' }}>{nivel}</strong></p>
      <p style={{ margin: 0, color: '#a8a8b3' }}>XP Total: <strong style={{ color: '#f5a623' }}>{xp} XP</strong></p>
    </div>
  )
}

export default PlayerCard
