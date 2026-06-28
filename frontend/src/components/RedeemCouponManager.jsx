import React, { useState } from 'react'
import { resgatarCupom } from '../services/api.js'

const rewards = [
  { id: 2, name: 'Barba de Respeito', cost: 300, benefit: '5% de Desconto', icon: '' },
  { id: 3, name: 'Lenda da Navalha', cost: 600, benefit: '10% de Desconto', icon: '⚡' },
  { id: 4, name: 'Rei da Cadeira', cost: 1000, benefit: '1 Corte Grátis', icon: '👑' }
]

function RedeemCouponManager({ clienteId, xpAtual = 0, onRedeemSuccess }) {
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState(null)
  const [successCode, setSuccessCode] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleRedeem = async (nivelId) => {
    setLoadingId(nivelId)
    setError(null)
    setSuccessCode(null)
    setCopied(false)
    try {
      const res = await resgatarCupom(clienteId, nivelId)
      if (res && res.data && res.data.codigo) {
        setSuccessCode(res.data.codigo)
        if (onRedeemSuccess) {
          onRedeemSuccess(res.data)
        }
      } else {
        throw new Error('Falha no resgate ou formato de resposta inválido.')
      }
    } catch (err) {
      console.error('Erro ao resgatar cupom:', err)
      const apiErr = err.response && err.response.data && err.response.data.error
      setError(apiErr || 'Erro ao conectar ao servidor para resgatar o cupom.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ width: '100%', marginTop: '1.25rem' }}>
      <h3 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', textAlign: 'left' }}>
        Recompensas RPG Disponíveis
      </h3>

      {error && (
        <div style={{ padding: '0.6rem', marginBottom: '1rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ff8a8a', fontSize: '0.78rem' }}>
          ⚠️ {error}
        </div>
      )}

      {successCode && (
        <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '8px', background: 'rgba(245, 166, 35, 0.12)', border: '1px dashed var(--gold)', textAlign: 'center', position: 'relative', animation: 'slideUp 0.3s ease' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Cupom Resgatado com Sucesso!</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <code style={{ fontSize: '1.2rem', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.05em' }}>{successCode}</code>
            <button 
              onClick={() => handleCopy(successCode)}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {copied ? '✅ Copiado' : '📋 Copiar'}
            </button>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Apresente este código no caixa da barbearia.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rewards.map((r) => {
          const unlocked = xpAtual >= r.cost
          const isRedeeming = loadingId === r.id
          const missingXp = r.cost - xpAtual

          return (
            <div 
              key={r.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: unlocked ? 'rgba(233, 69, 96, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                border: `1px solid ${unlocked ? 'rgba(233, 69, 96, 0.25)' : 'var(--border)'}`,
                transition: 'all var(--transition)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{r.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: unlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: unlocked ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 500 }}>
                    {r.benefit}
                  </div>
                </div>
              </div>

              <div>
                {unlocked ? (
                  <button 
                    className="btn btn-primary btn-sm"
                    disabled={isRedeeming}
                    onClick={() => handleRedeem(r.id)}
                    style={{ padding: '0.4rem 0.85rem' }}
                  >
                    {isRedeeming ? '...' : 'Resgatar'}
                  </button>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    🔒 Falta {missingXp} XP
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default RedeemCouponManager
