import React from 'react'
import PropTypes from 'prop-types'

// Mapeamento de emoji por nome de badge (fallback caso iconeUrl não exista)
const BADGE_EMOJI_MAP = {
  'Primeiro Sangue': '🩸',
  'Fiel da Navalha': '',
  'Barba de Respeito': '',
  'Lenda Viva': '👑',
}

const BADGE_COLOR_MAP = {
  'Primeiro Sangue': { unlocked: '#e74c3c', glow: 'rgba(231,76,60,0.4)' },
  'Fiel da Navalha': { unlocked: '#e67e22', glow: 'rgba(230,126,34,0.4)' },
  'Barba de Respeito': { unlocked: '#a0a0b8', glow: 'rgba(160,160,184,0.4)' },
  'Lenda Viva': { unlocked: '#f1c40f', glow: 'rgba(241,196,15,0.5)' },
}

function BadgeCard({ badge }) {
  if (!badge) return null;
  const badgeNome = String(badge.nome || '');
  const emoji = BADGE_EMOJI_MAP[badgeNome] || '🏅'
  const colors = BADGE_COLOR_MAP[badgeNome] || { unlocked: 'var(--primary-color, #e07a5f)', glow: 'rgba(224,122,95,0.4)' }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div
      title={badge.desbloqueada
        ? `Conquistado em: ${formatDate(badge.desbloqueadaEm)}`
        : `Como desbloquear: ${badge.descricao}`}
      className="badge-card"
      style={{
        border: badge.desbloqueada
          ? `2px solid ${colors.unlocked}`
          : '2px solid rgba(255,255,255,0.07)',
        backgroundColor: badge.desbloqueada
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(0,0,0,0.2)',
        boxShadow: badge.desbloqueada
          ? `0 0 18px ${colors.glow}, inset 0 0 10px rgba(255,255,255,0.03)`
          : 'none',
        filter: badge.desbloqueada ? 'none' : 'grayscale(1)',
        opacity: badge.desbloqueada ? 1 : 0.45,
      }}
    >
      {/* Ícone principal */}
      <div 
        className="badge-card-icon"
        style={{
          fontSize: badge.desbloqueada ? '2.2rem' : '1.8rem',
          filter: badge.desbloqueada
            ? `drop-shadow(0 0 6px ${colors.glow})`
            : 'none',
        }}>
        {badge.desbloqueada ? emoji : '🔒'}
      </div>

      {/* Nome */}
      <div 
        className="badge-card-name"
        style={{ color: badge.desbloqueada ? colors.unlocked : 'rgba(255,255,255,0.3)' }}
      >
        {badgeNome}
      </div>

      {/* Data de conquista ou dica */}
      {badge.desbloqueada && badge.desbloqueadaEm ? (
        <div className="badge-card-date">
          {formatDate(badge.desbloqueadaEm)}
        </div>
      ) : !badge.desbloqueada ? (
        <div className="badge-card-desc">
          {badge.descricao}
        </div>
      ) : null}

      {/* XP Bônus badge */}
      {badge.desbloqueada && badge.xpBonus > 0 && (
        <div className="badge-card-xp">
          +{badge.xpBonus} XP
        </div>
      )}
    </div>
  )
}

export default function BadgeShowcase({ badges = [], loading = false }) {
  const safeBadges = Array.isArray(badges) ? badges : []
  const desbloqueadas = safeBadges.filter(b => b && b.desbloqueada).length
  const total = safeBadges.length

  if (loading) {
    return (
      <div className="badge-showcase-container">
        <div className="badge-skeleton-header skeleton-pulse"></div>
        <div className="badge-showcase-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="badge-skeleton-card skeleton-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="badge-showcase-container">
      {/* Cabeçalho */}
      <div className="badge-showcase-header">
        <h3 className="badge-showcase-title">
          Vitrine de Conquistas
        </h3>
        <span className={`badge-showcase-count ${desbloqueadas === total && total > 0 ? 'badge-showcase-count-done' : 'badge-showcase-count-pending'}`}>
          {desbloqueadas === total && total > 0 ? '⭐ ' : ''}{desbloqueadas} / {total}
        </span>
      </div>

      {/* Barra de progresso de conquistas */}
      {total > 0 && (
        <div className="badge-showcase-progress-bg">
          <div 
            className="badge-showcase-progress-bar"
            style={{ width: `${(desbloqueadas / total) * 100}%` }} 
          />
        </div>
      )}

      {/* Grid de badges */}
      {safeBadges.length === 0 ? (
        <div className="badge-showcase-empty">
          Nenhuma conquista disponível ainda.
        </div>
      ) : (
        <div className="badge-showcase-grid">
          {safeBadges.map((badge, idx) => (
            <BadgeCard key={badge?.id || idx} badge={badge} />
          ))}
        </div>
      )}
    </div>
  )
}

BadgeShowcase.propTypes = {
  badges: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      nome: PropTypes.string.isRequired,
      desbloqueada: PropTypes.bool,
      desbloqueadaEm: PropTypes.string,
      descricao: PropTypes.string,
      xpBonus: PropTypes.number
    })
  ),
  loading: PropTypes.bool
}

