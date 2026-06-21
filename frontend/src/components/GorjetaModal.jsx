import React, { useState } from 'react'
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
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%' }}>
        <div className="modal-header">
          <h3>💸 Enviar Gorjeta Pix</h3>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem 0' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, textAlign: 'left' }}>
              Gostou do atendimento? Envie uma gorjeta digital direto para a conta do barbeiro <strong>{barbeiroNome}</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {[5, 10, 15, 20].map(val => (
                <button
                  key={val}
                  type="button"
                  className={valor === val && customVal === '' ? 'btn-primary' : 'btn-ghost'}
                  onClick={() => handleQuickSelect(val)}
                  style={{ padding: '0.5rem 0', fontSize: '0.85rem' }}
                >
                  R$ {val}
                </button>
              ))}
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
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
              <div style={{ color: 'var(--red)', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(233,69,96,0.05)', border: '1px solid var(--red)', borderRadius: '4px', textAlign: 'left' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              onClick={handleGerarPix}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Gerando Pix...' : 'Gerar QR Code Pix'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '0.5rem 0', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Escaneie o QR Code ou copie o código Pix abaixo para transferir <strong>R$ {gorjetaResult.valor.toFixed(2)}</strong> para <strong>{barbeiroNome}</strong>.
            </p>

            {gorjetaResult.qr_code_url && (
              <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <img src={gorjetaResult.qr_code_url} alt="QR Code Pix" style={{ width: '180px', height: '180px', display: 'block' }} />
              </div>
            )}

            <div style={{ width: '100%' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'left', display: 'block', marginBottom: '0.25rem' }}>Pix Copia e Cola</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  value={gorjetaResult.pix_copia_e_cola}
                  style={{ textOverflow: 'ellipsis', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopy}
                  style={{ fontSize: '0.8rem', padding: '0 1rem', whiteSpace: 'nowrap' }}
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', width: '100%', paddingTop: '0.75rem' }}>
              ℹ️ O pagamento será creditado na chave do barbeiro:<br />
              <strong style={{ color: 'var(--text-primary)' }}>{gorjetaResult.chave_pix}</strong>
            </div>

            <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%' }}>
              Fechar Janela
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
