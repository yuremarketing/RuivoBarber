import React from 'react'

function RpgProgressBar({ xpAtual, xpProximo }) {
  const percentual = Math.min((xpAtual / xpProximo) * 100, 100).toFixed(1)

  return (
    <div style={{ maxWidth: '400px', marginBottom: '1rem' }}>
      <p style={{ margin: '0 0 0.3rem', color: '#a8a8b3', fontSize: '0.85rem' }}>
        Progresso para próximo nível: {xpAtual} / {xpProximo} XP ({percentual}%)
      </p>
      <div style={{ background: '#0f3460', borderRadius: '8px', height: '18px', overflow: 'hidden', border: '1px solid #e94560' }}>
        <div style={{
          width: `${percentual}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #e94560, #f5a623)',
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  )
}

export default RpgProgressBar
