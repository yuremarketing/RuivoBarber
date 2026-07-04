import React, { useState, useEffect } from 'react'
import { fireConfetti, playLevelUpSound } from '../services/soundEffects.js'

export default function ChestReward({ isOpen, rewardTitle, rewardText, onClose }) {
  const [chestState, setChestState] = useState('closed') // closed, shaking, opened

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setChestState('closed')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleOpenChest = () => {
    if (chestState !== 'closed') return

    setChestState('shaking')
    
    // Simulate shaking time before opening
    setTimeout(() => {
      setChestState('opened')
      playLevelUpSound()
      fireConfetti()
    }, 1000)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          background: 'linear-gradient(135deg, #2a2a35 0%, #1a1a24 100%)',
          textAlign: 'center',
          border: chestState === 'opened' ? '2px solid #E0A800' : '1px solid #333',
          transition: 'all 0.5s ease',
          boxShadow: chestState === 'opened' ? '0 0 40px rgba(224, 168, 0, 0.4)' : 'none',
          overflow: 'hidden'
        }}
      >
        {chestState === 'opened' && <div className="chest-glow-bg"></div>}
        
        <div className="modal-header" style={{ borderBottom: 'none' }}>
          <h3 style={{ margin: '0 auto', color: '#E0A800' }}>
            {chestState === 'opened' ? '🎉 Recompensa Lendária!' : '🎁 Uma Recompensa te Aguarda!'}
          </h3>
          <button className="btn-ghost" onClick={onClose} style={{ position: 'absolute', right: '1rem' }}>✕</button>
        </div>

        <div style={{ padding: '2rem 1rem' }}>
          {/* Chest Image Animation */}
          <div 
            className={`chest-image-wrapper ${chestState}`} 
            onClick={handleOpenChest}
            style={{ 
              cursor: chestState === 'closed' ? 'pointer' : 'default',
              margin: '0 auto 2rem',
              width: '150px',
              height: '150px',
              position: 'relative',
              transition: 'transform 0.3s'
            }}
          >
            <span 
              role="img" 
              aria-label="chest" 
              style={{ 
                fontSize: '6rem', 
                filter: chestState === 'closed' ? 'grayscale(0.3) brightness(0.8)' : 'drop-shadow(0 0 20px #E0A800)',
                display: 'inline-block',
                transform: chestState === 'opened' ? 'scale(1.2)' : 'scale(1)'
              }}
            >
              {chestState === 'opened' ? '🏆' : '📦'}
            </span>
            {chestState === 'closed' && (
              <div className="chest-tap-hint">Toque para abrir!</div>
            )}
          </div>

          {/* Reward Text Reveal */}
          <div 
            style={{ 
              opacity: chestState === 'opened' ? 1 : 0, 
              transform: chestState === 'opened' ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease 0.2s', // slight delay after chest opens
            }}
          >
            <h2 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '0.5rem' }}>{rewardTitle}</h2>
            <p style={{ color: '#ccc', fontSize: '1.1rem', marginBottom: '1.5rem' }}>{rewardText}</p>
            <button className="btn btn-primary" onClick={onClose} style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem', borderRadius: '50px' }}>
              Incrivel!
            </button>
          </div>
        </div>
      </div>
      
      {/* CSS Animado */}
      <style dangerouslySetInnerHTML={{__html: `
        .chest-image-wrapper:hover {
          transform: scale(1.05);
        }
        .chest-image-wrapper.shaking span {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
          animation-iteration-count: infinite;
        }
        .chest-tap-hint {
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          color: #E0A800;
          font-size: 0.9rem;
          animation: pulse 1.5s infinite;
        }
        .chest-glow-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(224,168,0,0.4) 0%, rgba(0,0,0,0) 70%);
          transform: translate(-50%, -50%);
          z-index: 0;
          pointer-events: none;
          animation: rotate-glow 10s linear infinite;
        }
        .chest-image-wrapper > span, .chest-image-wrapper > div, .modal-header, .modal > div {
          position: relative;
          z-index: 1;
        }
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          50% { transform: translateX(5px) rotate(5deg); }
          75% { transform: translateX(-5px) rotate(-5deg); }
          100% { transform: translateX(0); }
        }
        @keyframes rotate-glow {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}} />
    </div>
  )
}
