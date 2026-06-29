import React, { useState, useEffect } from 'react'
import { fetchStatusCaixa, abrirCaixa, fecharCaixa, movimentarCaixa } from '../services/api.js'
import ErrorState from '../components/ErrorState.jsx'

export default function CaixaPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Operador","cargo":"Barbeiro"}')
  
  const [caixa, setCaixa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })

  // Modal states
  const [showAbrirModal, setShowAbrirModal] = useState(false)
  const [showFecharModal, setShowFecharModal] = useState(false)
  const [showMovModal, setShowMovModal] = useState(false)
  
  // Form states
  const [saldoInicial, setSaldoInicial] = useState('')
  const [saldoInformado, setSaldoInformado] = useState('')
  const [movTipo, setMovTipo] = useState('Entrada')
  const [movValor, setMovValor] = useState('')
  const [movMotivo, setMovMotivo] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type })
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000)
  }

  const loadCaixaStatus = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchStatusCaixa()
      if (res && res.data) {
        setCaixa(res.data)
      } else {
        setError('Não foi possível obter o status do caixa.')
      }
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Erro de conexão ao buscar status do caixa.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCaixaStatus()
  }, [])

  const handleAbrirCaixa = async (e) => {
    e.preventDefault()
    if (!saldoInicial || Number(saldoInicial) < 0) {
      showToast('O saldo inicial não pode ser negativo ou vazio.', 'error')
      return
    }
    setLoading(true)
    try {
      await abrirCaixa(Number(saldoInicial))
      showToast('Caixa aberto com sucesso! Pronto para faturamento.', 'success')
      setSaldoInicial('')
      setShowAbrirModal(false)
      await loadCaixaStatus()
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error || 'Falha ao abrir o caixa.', 'error')
      setLoading(false)
    }
  }

  const handleMovimentarCaixa = async (e) => {
    e.preventDefault()
    if (!movValor || Number(movValor) <= 0) {
      showToast('O valor deve ser maior que zero.', 'error')
      return
    }
    if (!movMotivo.trim()) {
      showToast('O motivo é obrigatório.', 'error')
      return
    }
    setLoading(true)
    try {
      await movimentarCaixa(movTipo, Number(movValor), movMotivo)
      showToast(`Movimentação de ${movTipo} registrada com sucesso!`, 'success')
      setMovValor('')
      setMovMotivo('')
      setShowMovModal(false)
      await loadCaixaStatus()
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error || 'Falha ao registrar movimentação.', 'error')
      setLoading(false)
    }
  }

  const handleFecharCaixa = async (e) => {
    e.preventDefault()
    if (!saldoInformado || Number(saldoInformado) < 0) {
      showToast('O saldo físico informado não pode ser negativo.', 'error')
      return
    }
    setLoading(true)
    try {
      await fecharCaixa(Number(saldoInformado))
      const diff = Number(saldoInformado) - (caixa?.saldo_atual || 0)
      
      let msg = 'Caixa fechado com sucesso!'
      if (diff === 0) {
        msg += ' Saldo bateu perfeitamente.'
      } else if (diff > 0) {
        msg += ` Sobra detectada: +R$ ${diff.toFixed(2)}.`
      } else {
        msg += ` Quebra detectada: -R$ ${Math.abs(diff).toFixed(2)}.`
      }

      showToast(msg, diff < 0 ? 'error' : 'success')
      setSaldoInformado('')
      setShowFecharModal(false)
      await loadCaixaStatus()
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error || 'Falha ao fechar o caixa.', 'error')
      setLoading(false)
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (error && !caixa) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <ErrorState message={error} onRetry={fetchCaixa} />
      </div>
    )
  }

  if (loading && !caixa) {
    return (
      <div className="main-content" style={{ padding: '2rem' }}>
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div className="skeleton-pulse" style={{ height: '35px', width: '30%', borderRadius: '4px' }}></div>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div className="card skeleton-pulse" style={{ height: '300px', flex: 1, borderRadius: '12px' }}></div>
          <div className="card skeleton-pulse" style={{ height: '300px', flex: 1, borderRadius: '12px' }}></div>
        </div>
      </div>
    )
  }

  const isCaixaFechado = !caixa || caixa.status === 'Fechado'
  const diferencaFechamento = saldoInformado !== '' ? (Number(saldoInformado) - (caixa?.saldo_atual || 0)) : 0

  return (
    <div className="main-content">
      {/* Toast Alert */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
          background: toast.type === 'success' ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: 'white', padding: '1rem 1.5rem', borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
          fontWeight: 600, animation: 'fadeIn 0.3s ease'
        }}>
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>Controle de Caixa</h2>
            <p>Monitore a sessão de caixa, registre movimentações manuais e gerencie o fluxo do estabelecimento.</p>
          </div>
          <div>
            <span className={`badge ${isCaixaFechado ? 'badge-cancelado' : 'badge-concluido'}`} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
              {isCaixaFechado ? '🔴 Caixa Fechado' : '🟢 Caixa Aberto'}
            </span>
          </div>
        </div>
      </div>



      {isCaixaFechado ? (
        /* ================= TELA CAIXA FECHADO ================= */
        <div style={{ display: 'flex', justifyContent: 'center', margin: '3rem 0' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}></div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>Sessão de Caixa Fechada</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
              Para iniciar o faturamento, registrar vendas e atendimentos, é necessário abrir uma sessão de caixa fornecendo o saldo inicial em dinheiro.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', justifyContent: 'center', fontSize: '1rem' }} onClick={() => setShowAbrirModal(true)}>
              🔓 Abrir Sessão de Caixa
            </button>
          </div>
        </div>
      ) : (
        /* ================= TELA CAIXA ABERTO ================= */
        <div>
          {/* Caixa Informações Gerais */}
          <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(22, 33, 62, 0.4)', backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Sessão Ativa</span>
                <h4 style={{ fontSize: '1.1rem', margin: '0.1rem 0' }}>ID do Caixa: #{caixa.caixa_id}</h4>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Aberto em: <strong>{formatDate(caixa.aberto_em)}</strong> pelo operador <strong>{user.nome}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => { setMovTipo('Entrada'); setShowMovModal(true) }}>
                  ➕ Suprimento
                </button>
                <button className="btn btn-secondary" onClick={() => { setMovTipo('Saida'); setShowMovModal(true) }}>
                  ➖ Sangria
                </button>
                <button className="btn btn-danger" onClick={() => setShowFecharModal(true)}>
                  Fechar Caixa
                </button>
              </div>
            </div>
          </div>

          {/* Grid de Estatísticas */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="icon"></div>
              <div className="label">Saldo Inicial</div>
              <div className="value">{formatCurrency(caixa.saldo_inicial)}</div>
              <div className="change" style={{ color: 'var(--text-secondary)' }}>Abertura da sessão</div>
            </div>
            <div className="stat-card">
              <div className="icon">📥</div>
              <div className="label">Entradas (Suprimentos)</div>
              <div className="value" style={{ color: 'var(--green)' }}>+{formatCurrency(caixa.entradas)}</div>
              <div className="change" style={{ color: 'var(--text-secondary)' }}>Aportes manuais</div>
            </div>
            <div className="stat-card">
              <div className="icon">📤</div>
              <div className="label">Saídas (Sangrias)</div>
              <div className="value" style={{ color: 'var(--red)' }}>-{formatCurrency(caixa.saidas)}</div>
              <div className="change" style={{ color: 'var(--text-secondary)' }}>Retiradas manuais</div>
            </div>
            <div className="stat-card" style={{ border: '1px solid rgba(245, 166, 35, 0.4)', boxShadow: '0 4px 20px rgba(245, 166, 35, 0.05)' }}>
              <div className="icon"></div>
              <div className="label" style={{ color: 'var(--gold)' }}>Saldo Esperado</div>
              <div className="value" style={{ color: 'var(--gold)' }}>{formatCurrency(caixa.saldo_atual)}</div>
              <div className="change" style={{ color: 'var(--green)' }}>Dinheiro físico em gaveta</div>
            </div>
          </div>

          {/* Histórico / Extrato de Movimentações */}
          <div className="card">
            <div className="card-header">
              <h3>📋 Extrato da Sessão Atual</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{caixa.movimentacoes?.length || 0} lançamentos</span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Motivo / Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {caixa.movimentacoes && caixa.movimentacoes.length > 0 ? (
                    caixa.movimentacoes.map((mov) => (
                      <tr key={mov.id}>
                        <td>{formatDate(mov.criado_em)}</td>
                        <td>
                          <span className={`badge ${mov.tipo === 'Entrada' ? 'badge-concluido' : 'badge-cancelado'}`}>
                            {mov.tipo === 'Entrada' ? '📥 Suprimento' : '📤 Sangria'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: mov.tipo === 'Entrada' ? 'var(--green)' : 'var(--red)' }}>
                          {mov.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(mov.valor)}
                        </td>
                        <td>{mov.motivo}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        Nenhuma movimentação manual registrada nesta sessão.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL ABRIR CAIXA ================= */}
      {showAbrirModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>🔓 Abrir Sessão de Caixa</h3>
              <button className="btn-ghost" onClick={() => setShowAbrirModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAbrirCaixa}>
              <div className="form-group">
                <label className="form-label">Saldo Inicial em Dinheiro (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="Ex: 100.00"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                  required
                  autoFocus
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
                  Informe o valor físico total contido no fundo de troco da gaveta de dinheiro.
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAbrirModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Abrir Caixa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL REGISTRAR MOVIMENTAÇÃO (SUPRIMENTO / SANGRIA) ================= */}
      {showMovModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{movTipo === 'Entrada' ? '📥 Registrar Suprimento (Aporte)' : '📤 Registrar Sangria (Retirada)'}</h3>
              <button className="btn-ghost" onClick={() => setShowMovModal(false)}>✕</button>
            </div>
            <form onSubmit={handleMovimentarCaixa}>
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  placeholder="Ex: 50.00"
                  value={movValor}
                  onChange={(e) => setMovValor(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Motivo / Justificativa</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Troco de moedas, Compra de café..."
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMovModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Lançamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL FECHAR CAIXA ================= */}
      {showFecharModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Fechar Sessão de Caixa</h3>
              <button className="btn-ghost" onClick={() => setShowFecharModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFecharCaixa}>
              <div style={{ background: 'rgba(245, 166, 35, 0.08)', border: '1px solid rgba(245, 166, 35, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Saldo Esperado em Caixa:</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gold)' }}>{formatCurrency(caixa?.saldo_atual)}</div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Este valor corresponde ao Fundo Inicial + Suprimentos - Sangrias + Vendas em Dinheiro.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Saldo Físico Contado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="Conte o dinheiro da gaveta e digite aqui"
                  value={saldoInformado}
                  onChange={(e) => setSaldoInformado(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {saldoInformado !== '' && (
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600,
                  background: diferencaFechamento === 0 ? 'rgba(34, 197, 94, 0.1)' : (diferencaFechamento > 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                  color: diferencaFechamento === 0 ? 'var(--green)' : (diferencaFechamento > 0 ? 'var(--blue)' : 'var(--red)'),
                  border: `1px solid ${diferencaFechamento === 0 ? 'rgba(34, 197, 94, 0.2)' : (diferencaFechamento > 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)')}`,
                  marginBottom: '1rem'
                }}>
                  {diferencaFechamento === 0 && 'Saldo bate perfeitamente com o esperado!'}
                  {diferencaFechamento > 0 && `📈 Sobras no caixa (Diferença positiva): +R$ ${diferencaFechamento.toFixed(2)}`}
                  {diferencaFechamento < 0 && `📉 Quebra de caixa (Diferença negativa): -R$ ${Math.abs(diferencaFechamento).toFixed(2)}`}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowFecharModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--red)' }}>Fechar Caixa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
