import React from 'react'
import PropTypes from 'prop-types'

const NIVEL_MAP = {
  1: 'Corte Iniciante',
  2: 'Barba de Respeito',
  3: 'Lenda da Navalha',
  4: 'Rei da Cadeira'
}

function resolveNivel(val) {
  if (val == null) return 'Corte Iniciante'
  if (typeof val === 'number' || !isNaN(Number(val))) {
    return NIVEL_MAP[Number(val)] || 'Corte Iniciante'
  }
  return String(val)
}

function RpgProgressBar({ xpAtual = 0, nivel }) {
  const safeXpAtual = Number(xpAtual) || 0;
  const nivelStr = resolveNivel(nivel)

  const getProximoNivelXP = (nivelNome, currentXp) => {
    switch (nivelNome) {
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

  const { nextXp, nextNivel, xpFaltando, maxLevel } = getProximoNivelXP(nivelStr, safeXpAtual)
  const percentual = maxLevel ? 100 : Math.min((safeXpAtual / nextXp) * 100, 100)
  
  // Média de 15 XP por atendimento
  const atendimentosEstimados = Math.ceil(xpFaltando / 15)

  return (
    <div className="rpg-progress-container">
      <div className="rpg-progress-header">
        <span className="rpg-progress-next">
          {maxLevel ? 'Nível Máximo Atingido!' : `Próximo Nível: ${nextNivel}`}
        </span>
        <span className="rpg-progress-stats">
          {safeXpAtual} / {maxLevel ? safeXpAtual : nextXp} XP
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
          <span>Você é uma lenda viva na RuivoBarber! 👑</span>
        ) : (
          <span>
            Faltam <strong>{xpFaltando} XP</strong> (~<strong>{atendimentosEstimados} atendimento(s)</strong>) para alcançar <strong>{nextNivel}</strong>!
          </span>
        )}
      </p>
    </div>
  )
}

RpgProgressBar.propTypes = {
  xpAtual: PropTypes.number,
  nivel: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
}

export default RpgProgressBar
