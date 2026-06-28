import React from 'react'

function RpgProgressBar({ xpAtual = 0, nivel = 'Corte Iniciante' }) {
  const getProximoNivelXP = (nivelNome, currentXp) => {
    let nomeNormalizado = ''
    if (typeof nivelNome === 'number') {
      const mapeamento = {
        1: 'Corte Iniciante',
        2: 'Barba de Respeito',
        3: 'Lenda da Navalha',
        4: 'Rei da Cadeira'
      }
      nomeNormalizado = mapeamento[nivelNome] || 'Corte Iniciante'
    } else {
      nomeNormalizado = String(nivelNome || '').trim()
    }

    switch (nomeNormalizado) {
      case 'Rei da Cadeira':
        return { nextXp: 1000, nextNivel: 'Nível Máximo', xpFaltando: 0, maxLevel: true }
      case 'Lenda da Navalha':
        return { nextXp: 1000, nextNivel: 'Rei da Cadeira', xpFaltando: Math.max(1000 - currentXp, 0), maxLevel: false }
      case 'Barba de Respeito':
        return { nextXp: 600, nextNivel: 'Lenda da Navalha', xpFaltando: Math.max(600 - currentXp, 0), maxLevel: false }
      default:
        return { nextXp: 300, nextNivel: 'Barba de Respeito', xpFaltando: Math.max(300 - currentXp, 0), maxLevel: false }
    }
  }

  const { nextXp, nextNivel, xpFaltando, maxLevel } = getProximoNivelXP(nivel, xpAtual)
  const percentual = maxLevel ? 100 : Math.min((xpAtual / nextXp) * 100, 100)
  
  // Média de 15 XP por atendimento
  const atendimentosEstimados = Math.ceil(xpFaltando / 15)

  return (
    <div className="rpg-progress-container">
      <div className="rpg-progress-header">
        <span className="rpg-progress-next">
          {maxLevel ? 'Nível Máximo Atingido!' : `Próximo Nível: ${nextNivel}`}
        </span>
        <span className="rpg-progress-stats">
          {xpAtual} / {maxLevel ? xpAtual : nextXp} XP
        </span>
      </div>

      <div className="xp-bar">
        <div 
          className="xp-bar-fill" 
          style={{ width: `${percentual.toFixed(1)}%` }} 
        />
      </div>

      <p className="rpg-progress-msg">
        {maxLevel ? (
          <span>⚔️ Você é uma lenda viva na RuivoBarber! 👑</span>
        ) : (
          <span>
            Faltam <strong>{xpFaltando} XP</strong> (~<strong>{atendimentosEstimados} atendimento(s)</strong>) para alcançar <strong>{nextNivel}</strong>!
          </span>
        )}
      </p>
    </div>
  )
}

export default RpgProgressBar
