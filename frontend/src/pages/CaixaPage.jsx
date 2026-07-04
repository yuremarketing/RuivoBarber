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
      <div className="main-content caixa-error-wrapper">
        <ErrorState message={error} onRetry={loadCaixaStatus} />
      </div>
    )
  }

  if (loading && !caixa) {
    return (
      <div className="main-content caixa-loading-wrapper">
        <div className="page-header caixa-skeleton-header">
          <div className="skeleton-pulse caixa-skeleton-title"></div>
        </div>
        <div className="caixa-skeleton-row">
          <div className="card skeleton-pulse caixa-skeleton-card"></div>
          <div className="card skeleton-pulse caixa-skeleton-card"></div>
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
        <div className={`checkout-toast ${toast.type === 'success' ? 'checkout-toast--success' : 'checkout-toast--error'}`}>
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
            <span className={`badge ${isCaixaFechado ? 'badge-cancelado' : 'badge-concluido'} caixa-badge-status`}>
              {isCaixaFechado ? '🔴 Caixa Fechado' : '🟢 Caixa Aberto'}
            </span>
          </div>
        </div>
      </div>

      {isCaixaFechado ? (
        /* ================= TELA CAIXA FECHADO ================= */
        <div className="caixa-closed-wrapper">
          <div className="card caixa-closed-card">
            <div className="caixa-closed-icon"></div>
            <h3 className="caixa-closed-title">Sessão de Caixa Fechada</h3>
            <p className="caixa-closed-desc">
              Para iniciar o faturamento, registrar vendas e atendimentos, é necessário abrir uma sessão de caixa fornecendo o saldo inicial em dinheiro.
            </p>
            <button className="btn btn-primary caixa-closed-btn" onClick={() => setShowAbrirModal(true)}>
              🔓 Abrir Sessão de Caixa
            </button>
          </div>
        </div>
      ) : (
        /* ================= TELA CAIXA ABERTO ================= */
        <div>
          {/* Caixa Informações Gerais */}
          <div className="card caixa-header-card">
            <div className="caixa-header-flex">
              <div>
                <span className="caixa-header-subtitle">Sessão Ativa</span>
                <h4 className="caixa-header-title">ID do Caixa: #{caixa.caixa_id}</h4>
                <span className="caixa-header-meta">
                  Aberto em: <strong>{formatDate(caixa.aberto_em)}</strong> pelo operador <strong>{user.nome}</strong>
                </span>
              </div>
              <div className="caixa-header-actions">
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
              <div className="change caixa-stat-desc">Abertura da sessão</div>
            </div>
            <div className="stat-card">
              <div className="icon">📥</div>
              <div className="label">Entradas (Suprimentos)</div>
              <div className="value caixa-stat-plus">+{formatCurrency(caixa.entradas)}</div>
              <div className="change caixa-stat-desc">Aportes manuais</div>
            </div>
            <div className="stat-card">
              <div className="icon">📤</div>
              <div className="label">Saídas (Sangrias)</div>
              <div className="value caixa-stat-minus">-{formatCurrency(caixa.saidas)}</div>
              <div className="change caixa-stat-desc">Retiradas manuais</div>
            </div>
            <div className="stat-card caixa-stat-expected">
              <div className="icon"></div>
              <div className="label">Saldo Esperado</div>
              <div className="value">{formatCurrency(caixa.saldo_atual)}</div>
              <div className="change">Dinheiro físico em gaveta</div>
            </div>
          </div>

          {/* Histórico / Extrato de Movimentações */}
          <div className="card">
            <div className="card-header">
              <h3>📋 Extrato da Sessão Atual</h3>
              <span className="caixa-extrato-meta">{caixa.movimentacoes?.length || 0} lançamentos</span>
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
                        <td className={mov.tipo === 'Entrada' ? 'caixa-extrato-val--plus' : 'caixa-extrato-val--minus'}>
                          {mov.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(mov.valor)}
                        </td>
                        <td>{mov.motivo}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="caixa-extrato-empty">
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
                <span className="caixa-modal-hint">
                  Informe o valor físico total contido no fundo de troco da gaveta de dinheiro.
                </span>
              </div>
              <div className="caixa-modal-actions">
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
              <div className="caixa-modal-actions">
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
              <div className="caixa-fechar-expected">
                <div className="caixa-fechar-expected-label">Saldo Esperado em Caixa:</div>
                <div className="caixa-fechar-expected-val">{formatCurrency(caixa?.saldo_atual)}</div>
                <p className="caixa-fechar-expected-hint">
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
                <div className={`caixa-diff ${diferencaFechamento === 0 ? 'caixa-diff--ok' : (diferencaFechamento > 0 ? 'caixa-diff--plus' : 'caixa-diff--minus')}`}>
                  {diferencaFechamento === 0 && 'Saldo bate perfeitamente com o esperado!'}
                  {diferencaFechamento > 0 && `📈 Sobras no caixa (Diferença positiva): +R$ ${diferencaFechamento.toFixed(2)}`}
                  {diferencaFechamento < 0 && `📉 Quebra de caixa (Diferença negativa): -R$ ${Math.abs(diferencaFechamento).toFixed(2)}`}
                </div>
              )}

              <div className="caixa-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFecharModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary caixa-btn-fechar">Fechar Caixa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
