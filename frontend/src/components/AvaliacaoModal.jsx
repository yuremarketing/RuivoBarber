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
            <span className="avaliacao-emoji">🎉</span>
            <h4 className="avaliacao-thanks">Obrigado pelo feedback!</h4>
            <p className="avaliacao-thanks-desc">
              Sua avaliação ajuda a manter o nível lendário da nossa barbearia.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-column gap-1-25 py-0-5">
            <div className="border-b pb-0-75 text-left">
              <p className="avaliacao-desc">
                Como foi seu último corte com o barbeiro <strong>{agendamento.barbeiro_nome}</strong>?
              </p>
              <span className="avaliacao-meta">
                Realizado em: {dataFormatada} | Serviço: {agendamento.servico_nome}
              </span>
            </div>

            <div className="flex-column flex-align-center gap-0-5">
              <span className="avaliacao-nota-label">
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
                    className="avaliacao-star-btn"
                    style={{ transform: (hoverNota || nota) >= star ? 'scale(1.15)' : 'scale(1)' }}
                    onClick={() => setNota(star)}
                    onMouseEnter={() => setHoverNota(star)}
                    onMouseLeave={() => setHoverNota(0)}
                    title={`Nota ${star}`}
                  >
                    <span className={(hoverNota || nota) >= star ? 'avaliacao-star-active' : 'avaliacao-star-inactive'}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group gorjeta-form-group-left">
              <label className="form-label">Comentário / Sugestão (Opcional)</label>
              <textarea
                className="form-input avaliacao-textarea"
                rows="4"
                placeholder="Conte-nos o que achou do atendimento..."
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                maxLength={300}
              />
              <div className="avaliacao-char-count">
                {comentario.length}/300 caracteres
              </div>
            </div>

            {errorMsg && (
              <div className="avaliacao-error">
                ⚠️ {errorMsg}
              </div>
            )}

            <div className="avaliacao-actions">
              <button
                type="button"
                className="btn btn-ghost avaliacao-btn-back"
                onClick={onClose}
                disabled={loading}
              >
                Voltar
              </button>
              <button
                type="submit"
                className="btn btn-primary avaliacao-btn-submit"
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

