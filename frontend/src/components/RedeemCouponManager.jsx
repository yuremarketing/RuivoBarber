import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { resgatarCupom } from '../services/api.js'
import ChestReward from './ChestReward.jsx'

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
  const [chestData, setChestData] = useState(null)

  const handleRedeem = async (nivelId) => {
    setLoadingId(nivelId)
    setError(null)
    setSuccessCode(null)
    setCopied(false)
    try {
      const res = await resgatarCupom(clienteId, nivelId)
      if (res && res.data && res.data.codigo) {
        setSuccessCode(res.data.codigo)
        const rewardInfo = rewards.find(r => r.id === nivelId)
        setChestData({
          isOpen: true,
          title: `Benefício Desbloqueado: ${rewardInfo.benefit}!`,
          text: `Cupom: ${res.data.codigo}`
        })
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
    <div className="redeem-container">
      <h3 className="redeem-title">
        Recompensas RPG Disponíveis
      </h3>

      {error && (
        <div className="redeem-error">
          ⚠️ {error}
        </div>
      )}

      {successCode && (
        <div className="redeem-success-box">
          <div className="redeem-success-label">Cupom Resgatado com Sucesso!</div>
          <div className="redeem-success-code-row">
            <code className="redeem-success-code">{successCode}</code>
            <button 
              onClick={() => handleCopy(successCode)}
              className="redeem-copy-btn"
            >
              {copied ? '✅ Copiado' : '📋 Copiar'}
            </button>
          </div>
          <div className="redeem-success-hint">Apresente este código no caixa da barbearia.</div>
        </div>
      )}

      <div className="flex-column gap-0-75">
        {rewards.map((r) => {
          const unlocked = xpAtual >= r.cost
          const isRedeeming = loadingId === r.id
          const missingXp = r.cost - xpAtual

          return (
            <div 
              key={r.id}
              className={`redeem-reward-card ${unlocked ? 'unlocked' : 'locked'}`}
            >
              <div className="redeem-reward-info">
                <span className="redeem-reward-icon">{r.icon}</span>
                <div className="redeem-reward-text">
                  <div className={unlocked ? 'redeem-reward-name-unlocked' : 'redeem-reward-name-locked'}>
                    {r.name}
                  </div>
                  <div className={unlocked ? 'redeem-reward-benefit-unlocked' : 'redeem-reward-benefit-locked'}>
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
                  >
                    {isRedeeming ? '...' : 'Resgatar'}
                  </button>
                ) : (
                  <span className="redeem-locked-label">
                    🔒 Falta {missingXp} XP
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ChestReward 
        isOpen={chestData !== null && chestData.isOpen} 
        rewardTitle={chestData?.title} 
        rewardText={chestData?.text} 
        onClose={() => setChestData(null)} 
      />
    </div>
  )
}

RedeemCouponManager.propTypes = {
  clienteId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  xpAtual: PropTypes.number,
  onRedeemSuccess: PropTypes.func
}

export default RedeemCouponManager

