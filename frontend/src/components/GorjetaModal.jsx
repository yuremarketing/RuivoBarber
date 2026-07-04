import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { criarGorjeta } from '../services/api.js'

export default function GorjetaModal({ agendamento, onClose, onSuccess }) {
  const [step, setStep] = useState(1) // 1 = Select amount, 2 = Display Pix details
  const [valor, setValor] = useState(5)
  const [customVal, setCustomVal] = useState('')
  const [loading, setLoading] = useState(false)
  const [gorjetaResult, setGorjetaResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const handleQuickSelect = (val) => {
    setValor(val)
    setCustomVal('')
  }

  const handleCustomChange = (e) => {
    const val = e.target.value
    setCustomVal(val)
    setValor(parseFloat(val) || 0)
  }

  const handleGerarPix = async (e) => {
    e.preventDefault()
    const valorFinal = customVal !== '' ? parseFloat(customVal) : valor
    if (valorFinal <= 0) {
      setErrorMsg('Por favor, informe um valor maior que R$ 0,00.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      const res = await criarGorjeta(agendamento.barbeiro_id, valorFinal, agendamento.id)
      if (res && res.data) {
        setGorjetaResult(res.data)
        setStep(2)
        if (onSuccess) onSuccess()
      } else {
        throw new Error('Retorno inválido do servidor.')
      }
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.error || 'Erro ao gerar o Pix para a gorjeta. Certifique-se de que o barbeiro possui chave Pix cadastrada.'
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!gorjetaResult) return
    navigator.clipboard.writeText(gorjetaResult.pix_copia_e_cola)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const barbeiroNome = agendamento.barbeiro_nome || `Barbeiro #${agendamento.barbeiro_id}`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal gorjeta-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Enviar Gorjeta Pix</h3>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        {step === 1 ? (
          <div className="flex-column gap-1-25 py-0-5">
            <p className="gorjeta-desc">
              Gostou do atendimento? Envie uma gorjeta digital direto para a conta do barbeiro <strong>{barbeiroNome}</strong>.
            </p>

            <div className="gorjeta-quick-grid">
              {[5, 10, 15, 20].map(val => (
                <button
                  key={val}
                  type="button"
                  className={`gorjeta-quick-btn ${valor === val && customVal === '' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handleQuickSelect(val)}
                >
                  R$ {val}
                </button>
              ))}
            </div>

            <div className="form-group gorjeta-form-group-left">
              <label className="form-label">Ou digite outro valor (R$)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="Ex: 8.50"
                value={customVal}
                onChange={handleCustomChange}
              />
            </div>

            {errorMsg && (
              <div className="gorjeta-error">
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              onClick={handleGerarPix}
              className="btn btn-primary gorjeta-submit"
              disabled={loading}
            >
              {loading ? 'Gerando Pix...' : 'Gerar QR Code Pix'}
            </button>
          </div>
        ) : (
          <div className="gorjeta-pix-container">
            <p className="gorjeta-pix-desc">
              Escaneie o QR Code ou copie o código Pix abaixo para transferir <strong>R$ {gorjetaResult.valor.toFixed(2)}</strong> para <strong>{barbeiroNome}</strong>.
            </p>

            {gorjetaResult.qr_code_url && (
              <div className="gorjeta-qr-box">
                <img src={gorjetaResult.qr_code_url} alt="QR Code Pix" className="gorjeta-qr-img" />
              </div>
            )}

            <div className="gorjeta-copy-section">
              <label className="form-label gorjeta-copy-label">Pix Copia e Cola</label>
              <div className="flex-row gap-0-5">
                <input
                  type="text"
                  readOnly
                  className="form-input gorjeta-copy-input"
                  value={gorjetaResult.pix_copia_e_cola}
                />
                <button
                  type="button"
                  className="btn btn-secondary gorjeta-copy-btn"
                  onClick={handleCopy}
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div className="gorjeta-pix-info">
              ℹ️ O pagamento será creditado na chave do barbeiro:<br />
              <strong className="gorjeta-pix-key">{gorjetaResult.chave_pix}</strong>
            </div>

            <button onClick={onClose} className="btn btn-ghost gorjeta-close-btn">
              Fechar Janela
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

GorjetaModal.propTypes = {
  agendamento: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    barbeiro_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    barbeiro_nome: PropTypes.string
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired
}

