import React, { useState, useEffect } from 'react'
import {
  fetchStatusCaixa,
  fetchAgendamentos,
  listarClientes,
  fetchServicos,
  fetchBarbeiros,
  processarVenda
} from '../services/api.js'

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
      const [agRes, cliRes, servRes, barbRes] = await Promise.all([
        fetchAgendamentos(),
        listarClientes(),
        fetchServicos(),
        fetchBarbeiros()
      ])

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

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner">Inicializando painel do PDV...</div>
      </div>
    )
  }

  if (!caixaAtivo) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔒</div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>Caixa Fechado</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            A tela de checkout/venda só pode ser acessada se houver uma sessão de caixa aberta pelo operador atual.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
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
        <h2>⚔️ Checkout do Caixa / PDV</h2>
        <p>Gere registros de vendas, conclua agendamentos de clientes e dê baixa automática no estoque.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.3fr', gap: '1.5rem', alignItems: 'stretch' }}>
        
        {/* ================= COLUNA 1: SELEÇÃO DE CLIENTE ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Cliente Ativo/Selecionado */}
          <div className="card" style={{ border: selectedCliente ? '1px solid rgba(245, 166, 35, 0.4)' : '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Cliente Selecionado</h4>
            {selectedCliente ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gold)' }}>{selectedCliente.nome}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {selectedAgendamento ? `📅 Agendamento #${selectedAgendamento.id}` : '👥 Seleção Avulsa'}
                  </span>
                </div>
                <button className="btn btn-ghost" onClick={() => { setSelectedCliente(null); setSelectedAgendamento(null); }} title="Remover cliente">✕</button>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Nenhum cliente selecionado. A venda será processada como anônima caso prossiga.
              </div>
            )}
          </div>

          {/* Abas de Seleção */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-input)', padding: '0.25rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <button 
                className={`btn btn-sm ${clientMode === 'agendamento' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '6px' }}
                onClick={() => setClientMode('agendamento')}
              >
                📅 Agendas
              </button>
              <button 
                className={`btn btn-sm ${clientMode === 'avulso' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '6px' }}
                onClick={() => setClientMode('avulso')}
              >
                👥 Clientes
              </button>
              <button 
                className={`btn btn-sm ${clientMode === 'anonimo' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '6px' }}
                onClick={() => { setClientMode('anonimo'); handleSelectAnonimo(); }}
              >
                👤 Anônimo
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px' }}>
              {clientMode === 'agendamento' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {agendamentos.length > 0 ? (
                    agendamentos.map((ag) => (
                      <div 
                        key={ag.id} 
                        onClick={() => handleSelectAgendamento(ag)}
                        style={{
                          background: 'var(--bg-input)', border: selectedAgendamento?.id === ag.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: '8px', padding: '0.75rem', cursor: 'pointer', transition: 'all var(--transition)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ag.clienteNome}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                            {new Date(ag.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Serviço: <strong>{ag.servicoNome}</strong> ({ag.barbeiroNome})
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '2rem 0' }}>
                      Nenhum agendamento pendente para hoje.
                    </div>
                  )}
                </div>
              )}

              {clientMode === 'avulso' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pesquisar cliente por nome..."
                    value={searchClientQuery}
                    onChange={(e) => setSearchClientQuery(e.target.value)}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '280px' }}>
                    {filteredClientes.length > 0 ? (
                      filteredClientes.map((cli) => (
                        <div 
                          key={cli.id} 
                          onClick={() => handleSelectClienteAvulso(cli)}
                          style={{
                            background: 'var(--bg-input)', border: selectedCliente?.id === cli.id && !selectedAgendamento ? '1px solid var(--gold)' : '1px solid var(--border)',
                            borderRadius: '6px', padding: '0.6rem 0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                        >
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{cli.nome}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{cli.login}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '2rem 0' }}>
                        Nenhum cliente cadastrado encontrado.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {clientMode === 'anonimo' && (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                  <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                    O cliente não quer se identificar. O checkout será efetuado de forma genérica.
                  </p>
                  <div style={{ background: 'rgba(233, 69, 96, 0.05)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                    ⚠️ Vendas para clientes anônimos <strong>não acumulam pontos de XP</strong> ou fidelidade e não interagem com o sistema de Clãs.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= COLUNA 2: LISTA DE SERVIÇOS ================= */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Serviços Disponíveis</h4>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '490px' }}>
            {servicos.length > 0 ? (
              servicos.map((serv) => (
                <div 
                  key={serv.id}
                  onClick={() => handleAddServico(serv)}
                  style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '0.85rem 1rem', cursor: 'pointer', transition: 'all var(--transition)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                  className="servico-item-card"
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{serv.nome}</div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>⏱️ {serv.duracaoMinutos} min | ⚔️ +{serv.xpRecompensa} XP</span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.95rem' }}>
                    {formatCurrency(serv.preco)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '2rem 0' }}>
                Nenhum serviço cadastrado encontrado.
              </div>
            )}
          </div>
        </div>

        {/* ================= COLUNA 3: CARRINHO DA VENDA ================= */}
        <form onSubmit={handleCheckout} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Resumo do Caixa Registradora</h4>

          {/* Lista de Itens do Carrinho */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: '8px' }}>
            {itensVenda.length > 0 ? (
              itensVenda.map((item, index) => (
                <div key={index} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem', position: 'relative' }}>
                  <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'flex-start', paddingRight: '1.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.nome}</div>
                    <button type="button" className="btn-ghost" style={{ position: 'absolute', right: 0, top: '-2px', padding: 0 }} onClick={() => handleRemoveItem(index)}>✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Preço Unitário</span>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="form-input" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        value={item.preco_unitario}
                        onChange={(e) => handleUpdatePrice(index, e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ width: '70px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Qtd</span>
                      <input 
                        type="number" 
                        min="1"
                        className="form-input" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        value={item.quantidade}
                        onChange={(e) => handleUpdateQty(index, e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '70px', paddingTop: '10px' }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {formatCurrency(item.preco_unitario * item.quantidade)}
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '3rem 0', fontStyle: 'italic' }}>
                Carrinho vazio. Selecione serviços na lista ao lado para adicionar.
              </div>
            )}
          </div>

          {/* Barbeiro Responsável */}
          <div className="form-group" style={{ marginBottom: 0 }}>
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
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">🎟️ Desconto (R$)</label>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {['Dinheiro', 'Pix', 'Debito', 'Credito'].map(method => (
                <button
                  key={method}
                  type="button"
                  className={`btn btn-sm ${metodoPagamento === method ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.5rem 0.25rem', fontSize: '0.8rem', justifyContent: 'center' }}
                  onClick={() => setMetodoPagamento(method)}
                >
                  {method === 'Dinheiro' && '💵 '}
                  {method === 'Pix' && '📱 '}
                  {method === 'Debito' && '💳 '}
                  {method === 'Credito' && '💳 '}
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Totais Finais e Ação */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              <span>Total Bruto:</span>
              <span>{formatCurrency(calculateTotalBruto())}</span>
            </div>
            {desconto > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--red)', marginBottom: '0.25rem' }}>
                <span>Desconto:</span>
                <span>-{formatCurrency(desconto)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '1rem' }}>
              <span>Valor Líquido:</span>
              <span>{formatCurrency(calculateTotalLiquido())}</span>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.85rem', justifyContent: 'center', fontSize: '1rem' }}
              disabled={submitting || itensVenda.length === 0}
            >
              {submitting ? 'Finalizando...' : '⚔️ Concluir Checkout / Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
