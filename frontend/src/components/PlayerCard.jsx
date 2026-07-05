import React from 'react'
import PropTypes from 'prop-types'

function PlayerCard({ 
  nome = 'Cliente', 
  nivel = 'Corte Iniciante', 
  xp = 0, 
  avatarUrl = '', 
  molduraEquipada = '', 
  fundoEquipado = '', 
  efeitoEquipado = '' 
}) {
  const getPatenteInfo = (nivelNome) => {
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
      nomeNormalizado = String(nivelNome || '')
    }

    switch (nomeNormalizado) {
      case 'Rei da Cadeira':
        return { frameClass: 'frame-royal', crown: true, color: '#b026ff', badgeEmoji: '👑' }
      case 'Lenda da Navalha':
        return { frameClass: 'frame-gold', crown: false, color: 'var(--gold)', badgeEmoji: '⚡' }
      case 'Barba de Respeito':
        return { frameClass: 'frame-silver', crown: false, color: '#a0a0b8', badgeEmoji: '' }
      default:
        return { frameClass: 'frame-bronze', crown: false, color: '#8a5a36', badgeEmoji: '🪵' }
    }
  }

  const { frameClass: defaultFrameClass, crown, color, badgeEmoji } = getPatenteInfo(nivel)
  const frameClass = molduraEquipada || defaultFrameClass
  const iniciais = String(nome || '')
    .split(' ')
    .map((n) => n ? n[0] : '')
    .slice(0, 2)
    .join('')

  const getGlowClass = (levelName) => {
    let normalized = ''
    if (typeof levelName === 'number') {
      const mapeamento = { 1: 'Corte Iniciante', 2: 'Barba de Respeito', 3: 'Lenda da Navalha', 4: 'Rei da Cadeira' }
      normalized = mapeamento[levelName] || 'Corte Iniciante'
    } else {
      normalized = String(levelName || '')
    }
    switch (normalized) {
      case 'Rei da Cadeira': return 'player-card-glow-royal';
      case 'Lenda da Navalha': return 'player-card-glow-gold';
      default: return '';
    }
  }

  const glowClass = getGlowClass(nivel)

  return (
    <div className={`player-card-rpg dota-card ${fundoEquipado} ${efeitoEquipado} ${glowClass}`}>
      <div className="avatar-rpg-container">
        {crown && <div className="badge-crown-rpg">👑</div>}
        <div className={`avatar-rpg-wrapper ${frameClass}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={nome} className="avatar-rpg-image" />
          ) : (
            <div className="avatar-rpg-placeholder">
              {iniciais}
            </div>
          )}
        </div>
      </div>

      <h2 className="player-card-name">
        {nome}
      </h2>

      <div className="player-card-badges">
        <span className="rpg-level-badge" style={{ background: color, color: '#fff' }}>
          {badgeEmoji} {nivel}
        </span>
      </div>

      <div className="player-card-stats-divider">
        <span className="player-card-stats-title">Ficha de Personagem</span>
        <div className="player-card-stats-xp">
          {xp} <span className="player-card-stats-xp-label">XP Total</span>
        </div>
      </div>
    </div>
  )
}

PlayerCard.propTypes = {
  nome: PropTypes.string,
  nivel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xp: PropTypes.number,
  avatarUrl: PropTypes.string,
  molduraEquipada: PropTypes.string,
  fundoEquipado: PropTypes.string,
  efeitoEquipado: PropTypes.string
}

export default PlayerCard


