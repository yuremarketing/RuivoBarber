import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { enviarAvaliacao } from '../services/api.js'

export default function AvaliacaoModal({ agendamento, onClose, onSuccess }) {
  const [nota, setNota] = useState(5)
  const [hoverNota, setHoverNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (nota < 1 || nota > 5) {
      setErrorMsg('Por favor, selecione uma nota de 1 a 5 estrelas.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    try {
      await enviarAvaliacao(agendamento.agendamento_id, nota, comentario)
      setSuccess(true)
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.response?.data?.error || 'Erro ao enviar a avaliação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const dataFormatada = new Date(agendamento.data_hora).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal w-full max-w-440" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⭐ Avaliar Atendimento</h3>
          <button className="btn-ghost" onClick={onClose} disabled={loading}>✕</button>
        </div>

        {success ? (
          <div className="flex-column flex-align-center gap-1 py-2 text-center">
            <span style={{ fontSize: '3rem', animation: 'bounce 1s infinite' }}>🎉</span>
            <h4 style={{ color: 'var(--gold)', margin: 0 }}>Obrigado pelo feedback!</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Sua avaliação ajuda a manter o nível lendário da nossa barbearia.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-column gap-1-25 py-0-5">
            <div className="border-b pb-0-75 text-left">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>
                Como foi seu último corte com o barbeiro <strong>{agendamento.barbeiro_nome}</strong>?
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Realizado em: {dataFormatada} | Serviço: {agendamento.servico_nome}
              </span>
            </div>

            <div className="flex-column flex-align-center gap-0-5">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {nota === 1 && '⭐ Terrível'}
                {nota === 2 && '⭐⭐ Ruim'}
                {nota === 3 && '⭐⭐⭐ Regular'}
                {nota === 4 && '⭐⭐⭐⭐ Muito Bom'}
                {nota === 5 && '⭐⭐⭐⭐⭐ Excelente!'}
              </span>

              <div className="flex-row gap-0-5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '2rem',
                      cursor: 'pointer',
                      padding: 0,
                      outline: 'none',
                      transition: 'transform 0.15s ease',
                      transform: (hoverNota || nota) >= star ? 'scale(1.15)' : 'scale(1)'
                    }}
                    onClick={() => setNota(star)}
                    onMouseEnter={() => setHoverNota(star)}
                    onMouseLeave={() => setHoverNota(0)}
                    title={`Nota ${star}`}
                  >
                    <span style={{
                      color: (hoverNota || nota) >= star ? 'var(--gold)' : 'var(--text-muted)',
                      textShadow: (hoverNota || nota) >= star ? '0 0 8px rgba(245, 166, 35, 0.4)' : 'none'
                    }}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Comentário / Sugestão (Opcional)</label>
              <textarea
                className="form-input"
                rows="4"
                placeholder="Conte-nos o que achou do atendimento..."
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                maxLength={300}
                style={{ resize: 'none', padding: '0.5rem', fontFamily: 'inherit' }}
              />
              <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {comentario.length}/300 caracteres
              </div>
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--red)', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(233,69,96,0.05)', border: '1px solid var(--red)', borderRadius: '4px', textAlign: 'left' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                style={{ flex: 1 }}
                disabled={loading}
              >
                Voltar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar Avaliação'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

AvaliacaoModal.propTypes = {
  agendamento: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    cliente_nome: PropTypes.string,
    barbeiro_nome: PropTypes.string,
    servico_nome: PropTypes.string,
    data_hora: PropTypes.string
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired
}

