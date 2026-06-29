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
  const emoji = BADGE_EMOJI_MAP[badge.nome] || '🏅'
  const colors = BADGE_COLOR_MAP[badge.nome] || { unlocked: 'var(--primary-color, #e07a5f)', glow: 'rgba(224,122,95,0.4)' }

  const formatDate = (dateStr) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div
      title={badge.desbloqueada
        ? `Conquistado em: ${formatDate(badge.desbloqueadaEm)}`
        : `Como desbloquear: ${badge.descricao}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        padding: '1rem 0.75rem',
        borderRadius: '14px',
        border: badge.desbloqueada
          ? `2px solid ${colors.unlocked}`
          : '2px solid rgba(255,255,255,0.07)',
        backgroundColor: badge.desbloqueada
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(0,0,0,0.2)',
        boxShadow: badge.desbloqueada
          ? `0 0 18px ${colors.glow}, inset 0 0 10px rgba(255,255,255,0.03)`
          : 'none',
        transition: 'all 0.3s ease',
        cursor: 'default',
        filter: badge.desbloqueada ? 'none' : 'grayscale(1)',
        opacity: badge.desbloqueada ? 1 : 0.45,
        minWidth: '100px',
      }}
    >
      {/* Ícone principal */}
      <div style={{
        fontSize: badge.desbloqueada ? '2.2rem' : '1.8rem',
        lineHeight: 1,
        filter: badge.desbloqueada
          ? `drop-shadow(0 0 6px ${colors.glow})`
          : 'none',
        transition: 'font-size 0.3s ease',
      }}>
        {badge.desbloqueada ? emoji : '🔒'}
      </div>

      {/* Nome */}
      <div style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        color: badge.desbloqueada ? colors.unlocked : 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        lineHeight: 1.3,
      }}>
        {badge.nome}
      </div>

      {/* Data de conquista ou dica */}
      {badge.desbloqueada && badge.desbloqueadaEm ? (
        <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          {formatDate(badge.desbloqueadaEm)}
        </div>
      ) : !badge.desbloqueada ? (
        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.3 }}>
          {badge.descricao}
        </div>
      ) : null}

      {/* XP Bônus badge */}
      {badge.desbloqueada && badge.xpBonus > 0 && (
        <div style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          fontSize: '0.55rem',
          fontWeight: 800,
          color: '#f1c40f',
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: '6px',
          padding: '1px 4px',
        }}>
          +{badge.xpBonus} XP
        </div>
      )}
    </div>
  )
}

export default function BadgeShowcase({ badges = [], loading = false }) {
  const desbloqueadas = badges.filter(b => b.desbloqueada).length
  const total = badges.length

  if (loading) {
    return (
      <div style={{ marginTop: '1.5rem' }}>
        <div style={{ height: '14px', width: '120px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: '1rem' }} className="skeleton-pulse"></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '110px', borderRadius: '14px' }} className="skeleton-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{
          margin: 0,
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'var(--text-color, #f4f1de)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          Vitrine de Conquistas
        </h3>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: desbloqueadas === total && total > 0 ? '#f1c40f' : 'var(--text-secondary)',
          backgroundColor: 'rgba(255,255,255,0.06)',
          padding: '0.2rem 0.6rem',
          borderRadius: '20px',
          border: desbloqueadas === total && total > 0
            ? '1px solid rgba(241,196,15,0.4)'
            : '1px solid rgba(255,255,255,0.1)',
        }}>
          {desbloqueadas === total && total > 0 ? '⭐ ' : ''}{desbloqueadas} / {total}
        </span>
      </div>

      {/* Barra de progresso de conquistas */}
      {total > 0 && (
        <div style={{
          height: '4px',
          borderRadius: '4px',
          backgroundColor: 'rgba(255,255,255,0.08)',
          marginBottom: '1rem',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(desbloqueadas / total) * 100}%`,
            background: 'linear-gradient(90deg, #e07a5f, #f1c40f)',
            borderRadius: '4px',
            transition: 'width 0.6s ease',
          }} />
        </div>
      )}

      {/* Grid de badges */}
      {badges.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          padding: '1.5rem',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '10px',
        }}>
          Nenhuma conquista disponível ainda.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: '0.75rem',
        }}>
          {badges.map(badge => (
            <BadgeCard key={badge.id} badge={badge} />
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

