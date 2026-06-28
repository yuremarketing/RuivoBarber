import React, { useEffect, useState } from 'react'
import { listarClientes, validarCupom } from '../services/api.js'

function AdminValidationPanel() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Estado para validação de cupom
  const [codigoCupom, setCodigoCupom] = useState('')
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [validationError, setValidationError] = useState(null)

  const fetchClientes = () => {
    listarClientes()
      .then(res => {
        setClientes(res.data || [])
        setError(null)
      })
      .catch(err => {
        console.error(err)
        setError('Ocorreu um erro ao carregar os clientes no painel.')
        setClientes([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  const handleValidarCupom = async (e) => {
    e.preventDefault()
    if (!codigoCupom.trim()) return

    setValidating(true)
    setValidationError(null)
    setValidationResult(null)

    try {
      const res = await validarCupom(codigoCupom.trim().toUpperCase())
      if (res && res.data) {
        setValidationResult(res.data)
        setCodigoCupom('')
        // Recarregar os clientes se necessário
        fetchClientes()
      } else {
        throw new Error('Resposta de validação inválida do servidor.')
      }
    } catch (err) {
      console.error('Erro ao validar cupom:', err)
      const apiErr = err.response && err.response.data && err.response.data.error
      setValidationError(apiErr || 'Código de cupom inválido ou expirado.')
    } finally {
      setValidating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Bloco 1: Tela de Validação de Cupons na hora do Pagamento */}
      <div className="card" style={{ border: '1px solid var(--border)' }}>
        <div className="card-header" style={{ paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--accent)' }}>Validar Cupom de Desconto</h3>
        </div>

        <form onSubmit={handleValidarCupom} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Código do Cupom</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="EX: BARBA5-X1Y2Z3"
                value={codigoCupom}
                onChange={e => setCodigoCupom(e.target.value)}
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.05em' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={validating}
                style={{ padding: '0 1.5rem' }}
              >
                {validating ? '...' : 'Validar'}
              </button>
            </div>
          </div>
        </form>

        {validationError && (
          <div style={{ padding: '0.75rem', marginTop: '1rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ff8a8a', fontSize: '0.82rem' }}>
            ❌ {validationError}
          </div>
        )}

        {validationResult && (
          <div style={{ padding: '1rem', marginTop: '1rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#a3e635' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>✅ Cupom Validado com Sucesso!</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
              Desconto de <strong>{validationResult.desconto_percent}%</strong> aplicado para o cliente ID {validationResult.cliente_id}.
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Descrição: {validationResult.descricao}
            </div>
          </div>
        )}
      </div>

      {/* Bloco 2: Lista de Clientes no RPG para Consulta Rápida */}
      <div className="card" style={{ border: '1px solid var(--border)' }}>
        <div className="card-header" style={{ paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <h3>👤 Consulta de Patentes RPG</h3>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: '6px', background: 'rgba(233, 69, 96, 0.15)', border: '1px solid #e94560', color: '#ff8a8a', fontSize: '0.85rem' }}>
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>A carregar...</p>
        ) : clientes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nenhum cliente cadastrado.</p>
        ) : (
          <div className="table-container">
            <table className="data-table" style={{ fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Patente</th>
                  <th>XP</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.nome}</td>
                    <td><span className="rpg-level-badge" style={{ fontSize: '0.55rem', padding: '0.2rem 0.5rem' }}>{c.nivel || 'Iniciante'}</span></td>
                    <td style={{ color: 'var(--gold)', fontWeight: 700 }}>{c.xp || 0} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminValidationPanel
