import React, { useState, useEffect } from 'react'
import { fetchServicos, fetchBarbeiros, fetchAgendamentos, fetchAgendaBarbeiro, criarAgendamento, concluirAtendimento, registrarFalta } from '../services/api.js'

const getServiceDetails = (nome) => {
  const n = nome.toLowerCase()
  if (n.includes('corte') && n.includes('barba')) {
    return { icon: '💈', desc: 'Combo completo: corte estilizado + barba na navalha' }
  } else if (n.includes('corte')) {
    return { icon: '✂️', desc: 'Corte masculino clássico com máquina e tesoura' }
  } else if (n.includes('barba')) {
    return { icon: '🧔', desc: 'Barba com toalha quente, navalha e hidratação' }
  } else if (n.includes('hidra')) {
    return { icon: '💧', desc: 'Tratamento profundo para cabelos danificados' }
  }
  return { icon: '✨', desc: 'Serviço personalizado de alta qualidade' }
}

const MOCK_BARBEIROS = [
  { id: 1, nome: 'Vitor Navalha (Mock)' },
  { id: 2, nome: 'Thiago Barba (Mock)' },
  { id: 3, nome: 'Yure Estilo (Mock)' }
]

const MOCK_SERVICOS = [
  { id: 1, nome: 'Corte Simples', preco: 35.00, xpRecompensa: 10, duracaoMinutos: 30 },
  { id: 2, nome: 'Corte + Barba', preco: 60.00, xpRecompensa: 25, duracaoMinutos: 60 },
  { id: 3, nome: 'Barba Completa', preco: 40.00, xpRecompensa: 15, duracaoMinutos: 45 },
  { id: 4, nome: 'Hidratação Capilar', preco: 50.00, xpRecompensa: 20, duracaoMinutos: 40 }
]

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState([])
  const [servicos, setServicos] = useState([])
  const [barbeiros, setBarbeiros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState(1)

  // Form states
  const [selectedServico, setSelectedServico] = useState('')
  const [selectedBarbeiro, setSelectedBarbeiro] = useState('')
  const [selectedData, setSelectedData] = useState('')
  const [selectedHora, setSelectedHora] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const userSessionStr = localStorage.getItem('ruivobarber_user')
  const user = userSessionStr ? JSON.parse(userSessionStr).user : null
  const isClient = user?.cargo === 'Cliente'

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [resAgendamentos, resServicos, resBarbeiros] = await Promise.all([
        fetchAgendamentos().catch(err => {
          console.warn('Erro ao buscar agendamentos, usando vazio:', err)
          return { data: [] }
        }),
        fetchServicos().catch(err => {
          console.warn('Erro ao buscar servicos, usando mock:', err)
          return { data: MOCK_SERVICOS }
        }),
        fetchBarbeiros().catch(err => {
          console.warn('Erro ao buscar barbeiros, usando mock:', err)
          return { data: MOCK_BARBEIROS }
        })
      ])
      
      setAgendamentos(resAgendamentos.data || [])
      
      const servicosData = resServicos.data && resServicos.data.length > 0 ? resServicos.data : MOCK_SERVICOS
      setServicos(servicosData)
      
      const barbeirosData = resBarbeiros.data && resBarbeiros.data.length > 0 ? resBarbeiros.data : MOCK_BARBEIROS
      setBarbeiros(barbeirosData)

      if (servicosData.length > 0) setSelectedServico(servicosData[0].id)
      if (barbeirosData.length > 0) setSelectedBarbeiro(barbeirosData[0].id)
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar os dados. Usando dados fictícios locais.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!selectedBarbeiro || !selectedData || !selectedServico) {
      setAvailableSlots([])
      return
    }

    const fetchSlots = async () => {
      setLoadingSlots(true)
      try {
        const res = await fetchAgendaBarbeiro(selectedBarbeiro, selectedData, selectedServico)
        setAvailableSlots(res.data || [])
      } catch (err) {
        console.error(err)
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [selectedBarbeiro, selectedData, selectedServico])

  const handleCreateAgendamento = async (e) => {
    e.preventDefault()
    if (!selectedServico || !selectedBarbeiro || !selectedData || !selectedHora) {
      alert('Por favor, preencha todos os campos.')
      return
    }

    try {
      const dataHoraStr = `${selectedData} ${selectedHora}`
      await criarAgendamento(selectedBarbeiro, selectedServico, dataHoraStr)
      setShowModal(false)
      setSelectedData('')
      setSelectedHora('')
      loadData()
      
      // Evento customizado para notificar o chat de que o agendamento foi atualizado
      const event = new CustomEvent('agendamentoCreated')
      window.dispatchEvent(event)
    } catch (err) {
      alert('Erro ao criar agendamento: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleConcluir = async (id) => {
    if (window.confirm('Deseja concluir este atendimento? Isso atualizará o XP do cliente.')) {
      try {
        await concluirAtendimento(id)
        loadData()
      } catch (err) {
        alert('Erro ao concluir: ' + (err.response?.data?.error || err.message))
      }
    }
  }

  const handleFalta = async (id) => {
    if (window.confirm('Registrar falta para este cliente? Dedução de 100 XP.')) {
      try {
        await registrarFalta(id)
        loadData()
      } catch (err) {
        alert('Erro ao registrar falta: ' + (err.response?.data?.error || err.message))
      }
    }
  }

  const statuses = ['Todos', 'Pendente', 'Confirmado', 'Concluido', 'Cancelado', 'Falta']
  const filtered = filtroStatus === 'Todos' ? agendamentos : agendamentos.filter(a => a.status === filtroStatus)

  // Estatísticas
  const getCount = (status) => agendamentos.filter(a => a.status === status).length

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>📅 Agendamentos</h2>
            <p>{isClient ? 'Seus horários marcados' : 'Gestão de horários e serviços'}</p>
          </div>
          <button className="btn btn-primary" onClick={() => {
            setSelectedData('')
            setSelectedHora('')
            setAvailableSlots([])
            setStep(1)
            setShowModal(true)
          }}>+ Novo Agendamento</button>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[{ s: 'Pendente', v: getCount('Pendente'), i: '⏳' },
          { s: 'Confirmado', v: getCount('Confirmado'), i: '✅' },
          { s: 'Concluido', v: getCount('Concluido'), i: '🏁' },
          { s: 'Falta', v: getCount('Falta'), i: '❌' }].map(x => (
          <div key={x.s} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setFiltroStatus(x.s)}>
            <div className="icon">{x.i}</div>
            <div className="value">{x.v}</div>
            <div className="label">{x.s}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {statuses.map(s => (
          <button key={s} className={`btn ${filtroStatus === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFiltroStatus(s)}>{s}</button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>A carregar agendamentos...</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum agendamento encontrado.</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Cliente</th><th>Barbeiro</th><th>Serviço</th><th>Data/Hora</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text-muted)' }}>#{a.id}</td>
                    <td style={{ fontWeight: 600 }}>{a.cliente_nome || `Cliente #${a.cliente_id}`}</td>
                    <td>{a.barbeiro_nome || `Barbeiro #${a.barbeiro_id}`}</td>
                    <td>{a.servico_nome || `Serviço #${a.servico_id}`}</td>
                    <td>{new Date(a.data_hora).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ fontWeight: 600 }}>R$ {a.preco ? a.preco.toFixed(2) : '35.00'}</td>
                    <td><span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span></td>
                    <td>
                      {!isClient && a.status === 'Pendente' && (
                        <button className="btn btn-ghost btn-sm" title="Concluir Atendimento" onClick={() => handleConcluir(a.id)}>🏁</button>
                      )}
                      {!isClient && a.status === 'Pendente' && (
                        <button className="btn btn-ghost btn-sm" title="Registrar Falta" onClick={() => handleFalta(a.id)}>❌</button>
                      )}
                      {a.status === 'Pendente' && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aguardando</span>
                      )}
                      {a.status !== 'Pendente' && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Finalizado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 Novo Agendamento</h3>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAgendamento}>
              {/* Indicador de Progresso (Stepper) */}
              <div className="wizard-stepper" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                position: 'relative',
                padding: '0 0.5rem'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '5%',
                  right: '5%',
                  height: '2px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  zIndex: 1,
                  transform: 'translateY(-50%)'
                }}>
                  <div style={{
                    width: `${((step - 1) / 3) * 100}%`,
                    height: '100%',
                    backgroundColor: 'var(--primary-color, #e07a5f)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                {[
                  { label: 'Barbeiro', icon: '🧔' },
                  { label: 'Serviço', icon: '✂️' },
                  { label: 'Data/Hora', icon: '📅' },
                  { label: 'Confirmar', icon: '✅' }
                ].map((s, idx) => {
                  const currentIdx = idx + 1;
                  const isActive = step >= currentIdx;
                  const isCurrent = step === currentIdx;
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      zIndex: 2,
                      position: 'relative'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: isCurrent 
                          ? 'var(--primary-color, #e07a5f)' 
                          : isActive 
                            ? 'var(--primary-color-dark, #c96248)' 
                            : 'rgba(255, 255, 255, 0.05)',
                        border: `2px solid ${isCurrent ? '#fff' : isActive ? 'var(--primary-color, #e07a5f)' : 'rgba(255, 255, 255, 0.15)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                        transition: 'all 0.3s ease',
                        boxShadow: isCurrent ? '0 0 10px var(--primary-color, #e07a5f)' : 'none'
                      }}>
                        {s.icon}
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        marginTop: '0.3rem',
                        color: isCurrent 
                          ? 'var(--primary-color, #e07a5f)' 
                          : isActive 
                            ? 'var(--text-color, #f4f1de)' 
                            : 'rgba(255, 255, 255, 0.3)',
                        fontWeight: isActive ? '600' : 'normal',
                        transition: 'all 0.3s ease'
                      }}>{s.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* Passo 1: Escolha do Barbeiro */}
              {step === 1 && (
                <div className="wizard-step-content fade-in-up">
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Selecione o Barbeiro:</h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '1rem',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    padding: '0.25rem'
                  }}>
                    {barbeiros.map(b => {
                      const isSelected = Number(selectedBarbeiro) === b.id;
                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            setSelectedBarbeiro(b.id);
                            setStep(2); // Avança automático
                          }}
                          style={{
                            padding: '1.25rem 1rem',
                            borderRadius: '12px',
                            backgroundColor: isSelected ? 'rgba(224, 122, 95, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: `2px solid ${isSelected ? 'var(--primary-color, #e07a5f)' : 'rgba(255, 255, 255, 0.08)'}`,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s ease',
                            transform: isSelected ? 'scale(1.02)' : 'none',
                            boxShadow: isSelected ? '0 4px 15px rgba(0, 0, 0, 0.2)' : 'none'
                          }}
                        >
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            margin: '0 auto 0.5rem auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                            fontWeight: 'bold',
                            color: 'var(--primary-color, #e07a5f)'
                          }}>
                            {b.nome ? b.nome.charAt(0).toUpperCase() : 'B'}
                          </div>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem', color: isSelected ? 'var(--primary-color, #e07a5f)' : 'var(--text-color)' }}>
                            {b.nome}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            Barbeiro Oficial
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Passo 2: Escolha do Serviço */}
              {step === 2 && (
                <div className="wizard-step-content fade-in-up">
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Selecione o Serviço:</h4>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    padding: '0.25rem'
                  }}>
                    {servicos.map(s => {
                      const isSelected = Number(selectedServico) === s.id;
                      const details = getServiceDetails(s.nome);
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedServico(s.id);
                            setStep(3); // Avança automático
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.85rem 1rem',
                            borderRadius: '10px',
                            backgroundColor: isSelected ? 'rgba(224, 122, 95, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            border: `1px solid ${isSelected ? 'var(--primary-color, #e07a5f)' : 'rgba(255, 255, 255, 0.08)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 2px 10px rgba(0, 0, 0, 0.15)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.3rem' }}>{details.icon}</span>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontWeight: '600', fontSize: '0.85rem', color: isSelected ? 'var(--primary-color, #e07a5f)' : 'var(--text-color)' }}>
                                {s.nome}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                ⏱️ {s.duracaoMinutos || 30} min | ⚔️ +{s.xpRecompensa || 10} XP
                              </div>
                            </div>
                          </div>
                          <div style={{ fontWeight: '700', fontSize: '1rem', color: isSelected ? 'var(--primary-color, #e07a5f)' : 'var(--text-color)' }}>
                            R$ {s.preco ? s.preco.toFixed(2) : '0.00'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Passo 3: Data e Hora */}
              {step === 3 && (
                <div className="wizard-step-content fade-in-up">
                  <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-color)' }}>Selecione Data e Horário:</h4>
                  
                  <div className="form-group" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                    <label className="form-label">Data do Agendamento</label>
                    <input type="date" className="form-input" value={selectedData} onChange={e => {
                      setSelectedData(e.target.value)
                      setSelectedHora('')
                    }} required />
                  </div>

                  <div className="form-group" style={{ textAlign: 'left' }}>
                    <label className="form-label">Horários Disponíveis</label>
                    {!selectedData ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Selecione uma data para ver os horários.</p>
                    ) : loadingSlots ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Consultando agenda...</p>
                    ) : availableSlots.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nenhum horário disponível para esta data.</p>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        maxHeight: '140px',
                        overflowY: 'auto',
                        padding: '0.25rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)'
                      }}>
                        {availableSlots.map(slot => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedHora(slot.time)}
                            style={{
                              padding: '0.4rem 0.25rem',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: selectedHora === slot.time
                                ? 'var(--primary-color, #e07a5f)'
                                : slot.available
                                  ? 'rgba(255, 255, 255, 0.15)'
                                  : 'transparent',
                              backgroundColor: selectedHora === slot.time
                                ? 'var(--primary-color, #e07a5f)'
                                : slot.available
                                  ? 'rgba(255, 255, 255, 0.05)'
                                  : 'rgba(255, 255, 255, 0.02)',
                              color: selectedHora === slot.time
                                ? '#fff'
                                : slot.available
                                  ? 'var(--text-color, #f4f1de)'
                                  : 'rgba(255, 255, 255, 0.2)',
                              cursor: slot.available ? 'pointer' : 'not-allowed',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              textDecoration: slot.available ? 'none' : 'line-through',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedHora && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--primary-color, #e07a5f)', fontWeight: 600 }}>
                        Horário Selecionado: {selectedHora}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Passo 4: Confirmação */}
              {step === 4 && (
                <div className="wizard-step-content fade-in-up">
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-color)', textAlign: 'center' }}>Confirmar Agendamento</h4>
                  
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cliente:</span>
                      <strong style={{ color: 'var(--text-color)', fontSize: '0.85rem' }}>{isClient ? user?.nome : (user?.nome || 'Admin/Barbeiro')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Barbeiro:</span>
                      <strong style={{ color: 'var(--text-color)', fontSize: '0.85rem' }}>{barbeiros.find(b => b.id === Number(selectedBarbeiro))?.nome || 'Não selecionado'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Serviço:</span>
                      <strong style={{ color: 'var(--text-color)', fontSize: '0.85rem' }}>
                        {servicos.find(s => s.id === Number(selectedServico))?.nome || 'Não selecionado'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Data/Hora:</span>
                      <strong style={{ color: 'var(--primary-color, #e07a5f)', fontSize: '0.85rem' }}>
                        {selectedData ? new Date(selectedData + 'T12:00:00').toLocaleDateString('pt-BR') : ''} às {selectedHora}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Duração:</span>
                      <strong style={{ color: 'var(--text-color)', fontSize: '0.85rem' }}>{servicos.find(s => s.id === Number(selectedServico))?.duracaoMinutos || 30} min</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Recompensa RPG:</span>
                      <strong style={{ color: 'var(--gold, #f39c12)', fontSize: '0.85rem' }}>+{servicos.find(s => s.id === Number(selectedServico))?.xpRecompensa || 10} XP</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.2rem' }}>
                      <span style={{ color: 'var(--text-color)', fontWeight: 'bold', fontSize: '0.95rem' }}>Valor do Serviço:</span>
                      <strong style={{ color: 'var(--primary-color, #e07a5f)', fontSize: '1.05rem', fontWeight: '800' }}>
                        R$ {servicos.find(s => s.id === Number(selectedServico))?.preco ? servicos.find(s => s.id === Number(selectedServico))?.preco.toFixed(2) : '0.00'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Rodapé do Wizard */}
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <div>
                  {step > 1 && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStep(step - 1)}>
                      ⬅️ Voltar
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {step < 4 ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={
                        (step === 1 && !selectedBarbeiro) ||
                        (step === 2 && !selectedServico) ||
                        (step === 3 && (!selectedData || !selectedHora))
                      }
                      onClick={() => setStep(step + 1)}
                    >
                      Avançar ➡️
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary btn-sm">
                      Confirmar Agendamento 📅
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
