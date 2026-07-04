import React, { useState, useEffect } from 'react'
import {
  fetchStatusCaixa,
  fetchAgendamentos,
  listarClientes,
  fetchServicos,
  fetchBarbeiros,
  processarVenda,
  fetchConfiguracoes
} from '../services/api.js'
import ErrorState from '../components/ErrorState.jsx'

export default function CheckoutPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Operador","cargo":"Barbeiro","id":1}')
  
  // App States
  const [caixaAtivo, setCaixaAtivo] = useState(null)
  const [agendamentos, setAgendamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [servicos, setServicos] = useState([])
  const [barbeiros, setBarbeiros] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })

  // Checkout States
  const [clientMode, setClientMode] = useState('agendamento') // agendamento | avulso | anonimo
  const [selectedCliente, setSelectedCliente] = useState(null)
  const [selectedAgendamento, setSelectedAgendamento] = useState(null)
  const [selectedBarbeiroId, setSelectedBarbeiroId] = useState('')
  const [searchClientQuery, setSearchClientQuery] = useState('')
  const [itensVenda, setItensVenda] = useState([])
  const [desconto, setDesconto] = useState(0)
  const [metodoPagamento, setMetodoPagamento] = useState('Dinheiro')
  const [config, setConfig] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type })
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      // 1. Verificar Caixa
      const statusRes = await fetchStatusCaixa()
      if (!statusRes || !statusRes.data || statusRes.data.status !== 'Aberto') {
        setCaixaAtivo(null)
        setLoading(false)
        return
      }
      setCaixaAtivo(statusRes.data)

      // 2. Carregar outros dados
      const [agRes, cliRes, servRes, barbRes, configRes] = await Promise.all([
        fetchAgendamentos(),
        listarClientes(),
        fetchServicos(),
        fetchBarbeiros(),
        fetchConfiguracoes().catch(() => ({ data: { aceitaDinheiro: true, aceitaPix: true, aceitaCartao: true } }))
      ])

      if (configRes && configRes.data) {
        setConfig(configRes.data)
        
        // Define o método padrão baseado no primeiro ativo
        if (configRes.data.aceitaDinheiro !== false) {
          setMetodoPagamento('Dinheiro')
        } else if (configRes.data.aceitaPix !== false) {
          setMetodoPagamento('Pix')
        } else if (configRes.data.aceitaCartao !== false) {
          setMetodoPagamento('Debito')
        }
      }

      if (agRes && agRes.data) {
        const pendentes = agRes.data.filter(a => a.status !== 'Concluido' && a.status !== 'Cancelado')
        setAgendamentos(pendentes)
      }
      if (cliRes && cliRes.data) {
        setClientes(cliRes.data)
      }
      if (servRes && servRes.data) {
        setServicos(servRes.data)
      }
      if (barbRes && barbRes.data) {
        setBarbeiros(barbRes.data)
      }

      // Pré-selecionar barbeiro se o operador for Barbeiro
      if (user.cargo === 'Barbeiro') {
        setSelectedBarbeiroId(user.id)
      }

    } catch (err) {
      console.error(err)
      setErrorMsg('Falha ao inicializar a tela de checkout.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSelectAgendamento = (ag) => {
    setSelectedAgendamento(ag)
    setSelectedCliente({ id: ag.clienteId, nome: ag.clienteNome })
    setSelectedBarbeiroId(ag.barbeiroId)
    
    // Adicionar o serviço do agendamento se ele ainda não estiver nos itens
    const servico = servicos.find(s => s.id === ag.servicoId)
    if (servico) {
      setItensVenda([{
        servico_id: servico.id,
        nome: servico.nome,
        preco_unitario: servico.preco,
        quantidade: 1
      }])
    }
    showToast(`Agendamento de ${ag.clienteNome} selecionado!`, 'success')
  }

  const handleSelectClienteAvulso = (cli) => {
    setSelectedCliente(cli)
    setSelectedAgendamento(null)
    showToast(`Cliente ${cli.nome} selecionado!`, 'success')
  }

  const handleSelectAnonimo = () => {
    setSelectedCliente(null)
    setSelectedAgendamento(null)
    showToast('Cliente definido como Anônimo/Não Identificado.', 'success')
  }

  const handleAddServico = (servico) => {
    const exist = itensVenda.find(item => item.servico_id === servico.id)
    if (exist) {
      setItensVenda(itensVenda.map(item => 
        item.servico_id === servico.id ? { ...item, quantidade: item.quantidade + 1 } : item
      ))
    } else {
      setItensVenda([...itensVenda, {
        servico_id: servico.id,
        nome: servico.nome,
        preco_unitario: servico.preco,
        quantidade: 1
      }])
    }
    showToast(`Item ${servico.nome} adicionado!`, 'success')
  }

  const handleRemoveItem = (index) => {
    setItensVenda(itensVenda.filter((_, i) => i !== index))
  }

  const handleUpdateQty = (index, qty) => {
    if (qty <= 0) return
    setItensVenda(itensVenda.map((item, i) => 
      i === index ? { ...item, quantidade: Number(qty) } : item
    ))
  }

  const handleUpdatePrice = (index, price) => {
    if (price < 0) return
    setItensVenda(itensVenda.map((item, i) => 
      i === index ? { ...item, preco_unitario: Number(price) } : item
    ))
  }

  const calculateTotalBruto = () => {
    return itensVenda.reduce((acc, item) => acc + (item.preco_unitario * item.quantidade), 0)
  }

  const calculateTotalLiquido = () => {
    const bruto = calculateTotalBruto()
    return Math.max(0, bruto - Number(desconto))
  }

  const handleCheckout = async (e) => {
    e.preventDefault()
    if (itensVenda.length === 0) {
      showToast('Adicione pelo menos um serviço para fechar a venda.', 'error')
      return
    }
    if (!selectedBarbeiroId) {
      showToast('Selecione o barbeiro executor do serviço.', 'error')
      return
    }

    setSubmitting(true)
    const payload = {
      cliente_id: selectedCliente ? selectedCliente.id : null,
      agendamento_id: selectedAgendamento ? selectedAgendamento.id : null,
      barbeiro_id: Number(selectedBarbeiroId),
      desconto: Number(desconto) || 0,
      metodo_pagamento: metodoPagamento,
      itens: itensVenda.map(item => ({
        servico_id: item.servico_id,
        preco_unitario: item.preco_unitario,
        quantidade: item.quantidade
      }))
    }

    try {
      await processarVenda(payload)
      showToast('Checkout realizado com sucesso! Venda registrada.', 'success')
      
      // Resetar form
      setItensVenda([])
      setDesconto(0)
      setSelectedCliente(null)
      setSelectedAgendamento(null)
      setSearchClientQuery('')
      setMetodoPagamento('Dinheiro')
      if (user.cargo !== 'Barbeiro') {
        setSelectedBarbeiroId('')
      }

      await loadData()
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.error || 'Falha ao processar venda.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchClientQuery.toLowerCase()) ||
    c.login.toLowerCase().includes(searchClientQuery.toLowerCase())
  )

  if (errorMsg) {
    return (
      <div className="main-content checkout-error-wrapper">
        <ErrorState message={errorMsg} onRetry={loadData} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="main-content">
        <div className="page-header checkout-skeleton-header">
          <div className="skeleton-pulse" style={{ height: '35px', width: '30%', borderRadius: '4px' }}></div>
        </div>
        <div className="checkout-skeleton-row">
          <div className="card skeleton-pulse checkout-skeleton-main"></div>
          <div className="card skeleton-pulse checkout-skeleton-side"></div>
        </div>
      </div>
    )
  }

  if (!caixaAtivo) {
    return (
      <div className="main-content checkout-closed-wrapper">
        <div className="card checkout-closed-card">
          <div className="checkout-closed-icon">🔒</div>
          <h3 className="checkout-closed-title">Caixa Fechado</h3>
          <p className="checkout-closed-text">
            A tela de checkout/venda só pode ser acessada se houver uma sessão de caixa aberta pelo operador atual.
          </p>
          <p className="checkout-closed-hint">
            Vá em <strong>Meu Caixa</strong> para abrir a sessão antes de realizar checkouts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content">
      {/* Toast Alert */}
      {toast.show && (
        <div className={`checkout-toast ${toast.type === 'success' ? 'checkout-toast--success' : 'checkout-toast--error'}`}>
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.msg}
        </div>
      )}

      <div className="page-header">
        <h2>Checkout do Caixa / PDV</h2>
        <p>Gere registros de vendas, conclua agendamentos de clientes e dê baixa automática no estoque.</p>
      </div>

      <div className="checkout-grid">
        
        {/* ================= COLUNA 1: SELEÇÃO DE CLIENTE ================= */}
        <div className="checkout-column">
          
          {/* Cliente Ativo/Selecionado */}
          <div className={`card ${selectedCliente ? 'checkout-client-card--selected' : 'checkout-client-card--default'}`}>
            <h4 className="checkout-section-title">Cliente Selecionado</h4>
            {selectedCliente ? (
              <div className="checkout-client-row">
                <div>
                  <div className="checkout-client-name">{selectedCliente.nome}</div>
                  <span className="checkout-client-sub">
                    {selectedAgendamento ? `Agendamento #${selectedAgendamento.id}` : 'Seleção Avulsa'}
                  </span>
                </div>
                <button className="btn btn-ghost" onClick={() => { setSelectedCliente(null); setSelectedAgendamento(null); }} title="Remover cliente">✕</button>
              </div>
            ) : (
              <div className="checkout-client-empty">
                Nenhum cliente selecionado. A venda será processada como anônima caso prossiga.
              </div>
            )}
          </div>

          {/* Abas de Seleção */}
          <div className="card checkout-tab-card">
            <div className="checkout-tab-bar">
              <button 
                className={`btn btn-sm checkout-tab-btn ${clientMode === 'agendamento' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setClientMode('agendamento')}
              >
                Agendas
              </button>
              <button 
                className={`btn btn-sm checkout-tab-btn ${clientMode === 'avulso' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setClientMode('avulso')}
              >
                Clientes
              </button>
              <button 
                className={`btn btn-sm checkout-tab-btn ${clientMode === 'anonimo' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setClientMode('anonimo'); handleSelectAnonimo(); }}
              >
                👤 Anônimo
              </button>
            </div>

            <div className="checkout-list-scroll">
              {clientMode === 'agendamento' && (
                <div className="flex-column gap-0-75">
                  {agendamentos.length > 0 ? (
                    agendamentos.map((ag) => (
                      <div 
                        key={ag.id} 
                        onClick={() => handleSelectAgendamento(ag)}
                        className="checkout-agenda-item"
                        style={{ border: selectedAgendamento?.id === ag.id ? '1px solid var(--accent)' : '1px solid var(--border)' }}
                      >
                        <div className="checkout-agenda-row">
                          <span className="checkout-agenda-name">{ag.clienteNome}</span>
                          <span className="checkout-agenda-time">
                            {new Date(ag.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="checkout-agenda-detail">
                          Serviço: <strong>{ag.servicoNome}</strong> ({ag.barbeiroNome})
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="checkout-empty-text">
                      Nenhum agendamento pendente para hoje.
                    </div>
                  )}
                </div>
              )}

              {clientMode === 'avulso' && (
                <div className="flex-column gap-0-75">
                  <input
                    type="text"
                    className="form-input mb-0-5"
                    placeholder="Pesquisar cliente por nome..."
                    value={searchClientQuery}
                    onChange={(e) => setSearchClientQuery(e.target.value)}
                  />
                  <div className="checkout-client-list">
                    {filteredClientes.length > 0 ? (
                      filteredClientes.map((cli) => (
                        <div 
                          key={cli.id} 
                          onClick={() => handleSelectClienteAvulso(cli)}
                          className="checkout-client-item"
                          style={{ border: selectedCliente?.id === cli.id && !selectedAgendamento ? '1px solid var(--gold)' : '1px solid var(--border)' }}
                        >
                          <span className="checkout-client-item-name">{cli.nome}</span>
                          <span className="checkout-client-item-login">@{cli.login}</span>
                        </div>
                      ))
                    ) : (
                      <div className="checkout-empty-text">
                        Nenhum cliente cadastrado encontrado.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {clientMode === 'anonimo' && (
                <div className="checkout-anon-section">
                  <p className="checkout-anon-text">
                    O cliente não quer se identificar. O checkout será efetuado de forma genérica.
                  </p>
                  <div className="checkout-anon-warning">
                    ⚠️ Vendas para clientes anônimos <strong>não acumulam pontos de XP</strong> ou fidelidade e não interagem com o sistema de Clãs.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= COLUNA 2: LISTA DE SERVIÇOS ================= */}
        <div className="card checkout-services-card">
          <h4 className="checkout-section-title checkout-section-title--mb1">Serviços Disponíveis</h4>
          <div className="checkout-services-list">
            {servicos.length > 0 ? (
              servicos.map((serv) => (
                <div 
                  key={serv.id}
                  onClick={() => handleAddServico(serv)}
                  className="checkout-service-item"
                >
                  <div>
                    <div className="checkout-service-name">{serv.nome}</div>
                    <span className="checkout-service-meta">{serv.duracaoMinutos} min | +{serv.xpRecompensa} XP</span>
                  </div>
                  <div className="checkout-service-price">
                    {formatCurrency(serv.preco)}
                  </div>
                </div>
              ))
            ) : (
              <div className="checkout-empty-text">
                Nenhum serviço cadastrado encontrado.
              </div>
            )}
          </div>
        </div>

        {/* ================= COLUNA 3: CARRINHO DA VENDA ================= */}
        <form onSubmit={handleCheckout} className="card checkout-cart">
          <h4 className="checkout-cart-title">Resumo do Caixa Registradora</h4>

          {/* Lista de Itens do Carrinho */}
          <div className="checkout-cart-items">
            {itensVenda.length > 0 ? (
              itensVenda.map((item, index) => (
                <div key={index} className="checkout-cart-item">
                  <div className="checkout-cart-item-header">
                    <div className="checkout-cart-item-name">{item.nome}</div>
                    <button type="button" className="btn-ghost checkout-cart-remove" onClick={() => handleRemoveItem(index)}>✕</button>
                  </div>
                  <div className="checkout-cart-item-fields">
                    <div className="checkout-cart-field-price">
                      <span className="checkout-cart-field-label">Preço Unitário</span>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="form-input checkout-cart-field-input"
                        value={item.preco_unitario}
                        onChange={(e) => handleUpdatePrice(index, e.target.value)}
                        required
                      />
                    </div>
                    <div className="checkout-cart-field-qty">
                      <span className="checkout-cart-field-label">Qtd</span>
                      <input 
                        type="number" 
                        min="1"
                        className="form-input checkout-cart-field-input"
                        value={item.quantidade}
                        onChange={(e) => handleUpdateQty(index, e.target.value)}
                        required
                      />
                    </div>
                    <div className="checkout-cart-field-total">
                      <strong>
                        {formatCurrency(item.preco_unitario * item.quantidade)}
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="checkout-cart-empty">
                Carrinho vazio. Selecione serviços na lista ao lado para adicionar.
              </div>
            )}
          </div>

          {/* Barbeiro Responsável */}
          <div className="form-group checkout-form-group--flush">
            <label className="form-label">💈 Barbeiro Responsável</label>
            <select 
              className="form-select"
              value={selectedBarbeiroId}
              onChange={(e) => setSelectedBarbeiroId(e.target.value)}
              required
            >
              <option value="">-- Selecione o Barbeiro --</option>
              {barbeiros.map(b => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
          </div>

          {/* Desconto */}
          <div className="form-group checkout-form-group--flush">
            <label className="form-label">Desconto (R$)</label>
            <input 
              type="number" 
              step="0.01"
              min="0"
              className="form-input"
              value={desconto}
              onChange={(e) => setDesconto(Math.max(0, Number(e.target.value)))}
              placeholder="Ex: 5.00"
            />
          </div>

          {/* Método de Pagamento */}
          <div>
            <label className="form-label">💳 Método de Pagamento</label>
            <div className="checkout-payment-grid">
              {['Dinheiro', 'Pix', 'Debito', 'Credito'].filter(method => {
                if (!config) return true;
                if (method === 'Dinheiro') return config.aceitaDinheiro !== false;
                if (method === 'Pix') return config.aceitaPix !== false;
                if (method === 'Debito' || method === 'Credito') return config.aceitaCartao !== false;
                return true;
              }).map(method => (
                <button
                  key={method}
                  type="button"
                  className={`btn btn-sm checkout-payment-btn ${metodoPagamento === method ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMetodoPagamento(method)}
                >
                  {method === 'Dinheiro' && ''}
                  {method === 'Pix' && '📱 '}
                  {method === 'Debito' && '💳 '}
                  {method === 'Credito' && '💳 '}
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Totais Finais e Ação */}
          <div className="checkout-totals">
            <div className="checkout-total-row">
              <span>Total Bruto:</span>
              <span>{formatCurrency(calculateTotalBruto())}</span>
            </div>
            {desconto > 0 && (
              <div className="checkout-total-row checkout-total-row--discount">
                <span>Desconto:</span>
                <span>-{formatCurrency(desconto)}</span>
              </div>
            )}
            <div className="checkout-total-row checkout-total-row--final">
              <span>Valor Líquido:</span>
              <span>{formatCurrency(calculateTotalLiquido())}</span>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary checkout-submit"
              disabled={submitting || itensVenda.length === 0}
            >
              {submitting ? 'Finalizando...' : 'Concluir Checkout / Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
