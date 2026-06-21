import React, { useState, useEffect } from 'react'
import { fetchServicos, fetchBarbeiros, fetchAgendamentos, fetchAgendaBarbeiro, criarAgendamento, concluirAtendimento, registrarFalta } from '../services/api.js'
import BookingWizard from '../components/BookingWizard.jsx'
import GorjetaModal from '../components/GorjetaModal.jsx'


const getLocalDateStr = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState([])
  const [servicos, setServicos] = useState([])
  const [barbeiros, setBarbeiros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [showGorjetaModal, setShowGorjetaModal] = useState(false)
  const [selectedAgendamentoParaGorjeta, setSelectedAgendamentoParaGorjeta] = useState(null)

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
        fetchAgendamentos(),
        fetchServicos(),
        isClient ? Promise.resolve({ data: [] }) : fetchBarbeiros()
      ])
      
      setAgendamentos(resAgendamentos.data || [])
      setServicos(resServicos.data || [])
      
      const listBarbeiros = resBarbeiros.data || []
      setBarbeiros(listBarbeiros)

      if (resServicos.data?.length > 0) setSelectedServico(resServicos.data[0].id)
      if (listBarbeiros.length > 0) setSelectedBarbeiro(listBarbeiros[0].id)
      else if (isClient) {
        // Para clientes, buscar lista de barbeiros de qualquer forma para selecionar no form
        const fallbackBarbeiros = await fetchBarbeiros()
        setBarbeiros(fallbackBarbeiros.data || [])
        if (fallbackBarbeiros.data?.length > 0) setSelectedBarbeiro(fallbackBarbeiros.data[0].id)
      }
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar os dados. Verifique a ligação ao servidor.')
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

    const gerarSlotsMock = () => {
      const slots = []
      let hour = 9
      let min = 0
      while (hour < 19) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
        slots.push({ time: timeStr, available: true })
        min += 30
        if (min >= 60) {
          min = 0
          hour += 1
        }
      }
      return slots
    }

    const fetchSlots = async () => {
      setLoadingSlots(true)
      try {
        const res = await fetchAgendaBarbeiro(selectedBarbeiro, selectedData, selectedServico)
        const slots = res.data || []
        if (slots.length > 0) {
          setAvailableSlots(slots)
        } else {
          setAvailableSlots(gerarSlotsMock())
        }
      } catch (err) {
        console.warn("Erro ao buscar horários da agenda, utilizando mock fallback:", err)
        setAvailableSlots(gerarSlotsMock())
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
                    <td>{new Date(a.data_hora).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Finalizado</span>
                          {isClient && a.status === 'Concluido' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--gold)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '4px' }}
                              title="Enviar Gorjeta Pix ao Barbeiro"
                              onClick={() => {
                                setSelectedAgendamentoParaGorjeta(a)
                                setShowGorjetaModal(true)
                              }}
                            >
                              💸 Gorjeta
                            </button>
                          )}
                        </div>
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
            {isClient ? (
              <BookingWizard
                servicos={servicos}
                barbeiros={barbeiros}
                onClose={() => setShowModal(false)}
                onSuccess={() => {
                  setShowModal(false)
                  loadData()
                  // Evento customizado para notificar o chat de que o agendamento foi atualizado
                  const event = new CustomEvent('agendamentoCreated')
                  window.dispatchEvent(event)
                }}
              />
            ) : (
              <form onSubmit={handleCreateAgendamento}>
                <div className="form-group">
                  <label className="form-label">Cliente</label>
                  <select className="form-input" disabled><option>{user?.nome || 'Admin/Barbeiro'}</option></select>
                  <small style={{ color: 'var(--text-muted)' }}>Agendamento será criado no seu nome.</small>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Barbeiro</label>
                    <select className="form-input" value={selectedBarbeiro} onChange={e => setSelectedBarbeiro(e.target.value)}>
                      {barbeiros.map(b => (
                        <option key={b.id} value={b.id}>{b.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Serviço</label>
                    <select className="form-input" value={selectedServico} onChange={e => setSelectedServico(e.target.value)}>
                      {servicos.map(s => (
                        <option key={s.id} value={s.id}>{s.nome} - R$ {s.preco.toFixed(2)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Data</label>
                    <input type="date" className="form-input" value={selectedData} onChange={e => {
                      setSelectedData(e.target.value)
                      setSelectedHora('')
                    }} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Horários Disponíveis (Sessão de 30 min)</label>
                    {!selectedData ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Selecione uma data para consultar os horários.</p>
                    ) : loadingSlots ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Carregando horários...</p>
                    ) : availableSlots.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nenhum slot disponível.</p>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        maxHeight: '180px',
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
                              padding: '0.5rem 0.25rem',
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
                              fontSize: '0.85rem',
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
                      <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--primary-color, #e07a5f)', fontWeight: 600 }}>
                        Horário Selecionado: {selectedHora}
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Agendar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {showGorjetaModal && selectedAgendamentoParaGorjeta && (
        <GorjetaModal
          agendamento={selectedAgendamentoParaGorjeta}
          onClose={() => {
            setShowGorjetaModal(false)
            setSelectedAgendamentoParaGorjeta(null)
          }}
          onSuccess={() => {
            fetchAgendamentos().then(res => setAgendamentos(res.data || []))
          }}
        />
      )}
    </div>
  )
}
