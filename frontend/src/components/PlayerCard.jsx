import React from 'react'

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
      nomeNormalizado = String(nivelNome || '').trim()
    }

    switch (nomeNormalizado) {
      case 'Rei da Cadeira':
        return { frameClass: 'frame-royal', crown: true, color: '#b026ff', badgeEmoji: '👑' }
      case 'Lenda da Navalha':
        return { frameClass: 'frame-gold', crown: false, color: 'var(--gold)', badgeEmoji: '⚡' }
      case 'Barba de Respeito':
        return { frameClass: 'frame-silver', crown: false, color: '#a0a0b8', badgeEmoji: '🛡️' }
      default:
        return { frameClass: 'frame-bronze', crown: false, color: '#8a5a36', badgeEmoji: '🪵' }
    }
  }

  const { frameClass: defaultFrameClass, crown, color, badgeEmoji } = getPatenteInfo(nivel)
  const frameClass = molduraEquipada || defaultFrameClass
  const iniciais = (nome || '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')

  return (
    <div className={`player-card-rpg ${fundoEquipado} ${efeitoEquipado}`}>
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

      <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
        {nome}
      </h2>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
        <span className="rpg-level-badge" style={{ background: color, color: '#fff' }}>
          {badgeEmoji} {nivel}
        </span>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', width: '100%', paddingTop: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ficha de Personagem</span>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gold)', marginTop: '0.25rem' }}>
          {xp} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>XP Total</span>
        </div>
      </div>
    </div>
  )
}

export default PlayerCard

