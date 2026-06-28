import React, { useState, useEffect, useMemo, useRef } from 'react'
import { fetchServicos, fetchBarbeiros, fetchAgendamentos, fetchAgendaBarbeiro, criarAgendamento, concluirAtendimento, registrarFalta, fetchDisponibilidadeBarbeiro, fetchBloqueiosBarbeiro } from '../services/api.js'
import BookingWizard from '../components/BookingWizard.jsx'
import GorjetaModal from '../components/GorjetaModal.jsx'


const getLocalDateStr = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

const getHorizontalDays = () => {
  const days = [];
  const todayStr = getLocalDateStr();
  const baseDate = new Date(`${todayStr}T12:00:00-03:00`);
  for (let i = 0; i < 14; i++) {
    const nextDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(nextDate);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const dateStr = `${year}-${month}-${day}`;

    const weekday = nextDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short' })
      .replace('.', '')
      .toUpperCase();
    
    const monthName = nextDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'short' })
      .replace('.', '')
      .toUpperCase();

    days.push({
      dateStr,
      dayVal: day,
      dayName: weekday.substring(0, 3),
      monthName: monthName.substring(0, 3)
    });
  }
  return days;
}

export default function AgendamentosPage() {
  const horizontalDays = useMemo(() => getHorizontalDays(), [])
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
  const [barbeiroDisponibilidades, setBarbeiroDisponibilidades] = useState([])
  const [barbeiroBloqueios, setBarbeiroBloqueios] = useState([])

  // Drag to Scroll references and states
  const datePickerRef = useRef(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeftState, setScrollLeftState] = useState(0)
  const [isDraggingDate, setIsDraggingDate] = useState(false)

  const handleMouseDownDate = (e) => {
    setIsMouseDown(true)
    setIsDraggingDate(false)
    setStartX(e.pageX - datePickerRef.current.offsetLeft)
    setScrollLeftState(datePickerRef.current.scrollLeft)
  }

  const handleMouseLeaveDate = () => {
    setIsMouseDown(false)
  }

  const handleMouseUpDate = () => {
    setIsMouseDown(false)
    setTimeout(() => {
      setIsDraggingDate(false)
    }, 50)
  }

  const handleMouseMoveDate = (e) => {
    if (!isMouseDown) return
    e.preventDefault()
    const x = e.pageX - datePickerRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    if (Math.abs(x - startX) > 5) {
      setIsDraggingDate(true)
    }
    datePickerRef.current.scrollLeft = scrollLeftState - walk
  }


  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const triggerToast = (msg) => {
    setToastMessage(msg)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 4500)
  }

  const userSessionStr = localStorage.getItem('ruivobarber_user')
  const session = userSessionStr ? JSON.parse(userSessionStr) : null
  const user = session?.user || session
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
    // 1. Local event listener for updates within the same window (e.g. from chat widget)
    const handleLocalUpdate = () => {
      loadData()
    }
    window.addEventListener('agendamentoCreated', handleLocalUpdate)

    // 2. BroadcastChannel for Cross-Tab Sync (Instantly notifies other tabs)
    const channel = new BroadcastChannel('ruivobarber_events')
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'agendamentoCreated') {
        loadData()
        
        // Show notification toast if this is a Barber or Admin
        const booking = event.data.data
        if (booking && (user?.cargo === 'Barbeiro' || user?.cargo === 'Adm')) {
          let dateStr = ''
          let timeStr = ''
          if (booking.data_hora) {
            const dateParts = booking.data_hora.split('T')
            dateStr = dateParts[0].split('-').reverse().join('/')
            timeStr = dateParts[1] ? dateParts[1].substring(0, 5) : ''
          }
          triggerToast(`Novo agendamento: ${booking.cliente_nome} com ${booking.barbeiro_nome} em ${dateStr} às ${timeStr}!`)
        }
      }
    }

    // 3. Smart Polling (every 10 seconds, active only when tab is visible)
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        fetchAgendamentos().then(res => {
          if (res.data) setAgendamentos(res.data)
        }).catch(err => console.warn('Silent poll failed:', err))
      }
    }, 10000)

    return () => {
      window.removeEventListener('agendamentoCreated', handleLocalUpdate)
      channel.close()
      clearInterval(pollInterval)
    }
  }, [user])

  useEffect(() => {
    if (!selectedBarbeiro) {
      setBarbeiroDisponibilidades([])
      setBarbeiroBloqueios([])
      return
    }
    const loadBarberConfigs = async () => {
      try {
        const [resDisp, resBloq] = await Promise.all([
          fetchDisponibilidadeBarbeiro(selectedBarbeiro).catch(() => ({ data: [] })),
          fetchBloqueiosBarbeiro(selectedBarbeiro).catch(() => ({ data: [] }))
        ])
        setBarbeiroDisponibilidades(resDisp.data || [])
        setBarbeiroBloqueios(resBloq.data || [])
      } catch (err) {
        console.error("Erro ao buscar configurações do barbeiro:", err)
      }
    }
    loadBarberConfigs()
  }, [selectedBarbeiro])

  const handleDateChange = (dateVal) => {
    if (!dateVal) {
      setSelectedData('')
      setSelectedHora('')
      return
    }

    const todayStr = getLocalDateStr()
    if (dateVal < todayStr) {
      alert('Não é possível selecionar uma data no passado.')
      setSelectedData('')
      setSelectedHora('')
      return
    }

    const [year, month, day] = dateVal.split('-').map(Number)
    const dateObj = new Date(year, month - 1, day)
    const weekday = dateObj.getDay()

    const disp = barbeiroDisponibilidades.find(d => d.dia_semana === weekday)
    if (disp && !disp.trabalha) {
      alert('Este barbeiro não possui disponibilidade para este dia. Por favor, escolha outra data!')
      setSelectedData('')
      setSelectedHora('')
      return
    }

    const isBlocked = barbeiroBloqueios.some(b => b.data_bloqueio === dateVal)
    if (isBlocked) {
      alert('Este barbeiro não possui disponibilidade para este dia. Por favor, escolha outra data!')
      setSelectedData('')
      setSelectedHora('')
      return
    }

    setSelectedData(dateVal)
    setSelectedHora('')
  }

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
      
      console.log('=== DEBUG: FORMATO DE ENVIO DO AGENDAMENTO ===')
      console.log('Payload:', {
        barbeiro_id: Number(selectedBarbeiro),
        servico_id: Number(selectedServico),
        data_hora: dataHoraStr
      })
      console.log('==============================================')

      try {
        await criarAgendamento(selectedBarbeiro, selectedServico, dataHoraStr)
        loadData()

        // Broadcast real booking event to other tabs
        const channel = new BroadcastChannel('ruivobarber_events')
        channel.postMessage({
          type: 'agendamentoCreated',
          data: {
            id: Math.floor(Math.random() * 1000) + 1000,
            cliente_id: user?.id || 1,
            cliente_nome: user?.nome || 'Cliente',
            barbeiro_id: Number(selectedBarbeiro),
            barbeiro_nome: barbeiros.find(b => b.id === Number(selectedBarbeiro))?.nome || 'Barbeiro',
            servico_id: Number(selectedServico),
            servico_nome: servicos.find(s => s.id === Number(selectedServico))?.nome || 'Serviço',
            data_hora: `${selectedData}T${selectedHora}:00-03:00`,
            status: 'Pendente',
            preco: servicos.find(s => s.id === Number(selectedServico))?.preco || 0.00
          }
        })
        channel.close()
      } catch (apiErr) {
        console.warn('Falha na API, criando agendamento em memória local (Mock Mode):', apiErr)
        const novoAgendamentoFicticio = {
          id: Math.floor(Math.random() * 1000) + 100,
          cliente_id: user?.id || 1,
          cliente_nome: user?.nome || 'Admin/Barbeiro',
          barbeiro_id: Number(selectedBarbeiro),
          barbeiro_nome: barbeiros.find(b => b.id === Number(selectedBarbeiro))?.nome || 'Barbeiro de Teste',
          servico_id: Number(selectedServico),
          servico_nome: servicos.find(s => s.id === Number(selectedServico))?.nome || 'Serviço de Teste',
          data_hora: `${selectedData}T${selectedHora}:00-03:00`,
          status: 'Confirmado',
          preco: servicos.find(s => s.id === Number(selectedServico))?.preco || 60.00
        }
        setAgendamentos(prev => [novoAgendamentoFicticio, ...prev])

        // Broadcast mock booking event to other tabs
        const channel = new BroadcastChannel('ruivobarber_events')
        channel.postMessage({
          type: 'agendamentoCreated',
          data: novoAgendamentoFicticio
        })
        channel.close()

        alert('Modo de Teste Local: O agendamento foi simulado e salvo temporariamente na memória do navegador (API indisponível ou Token inválido/expirado).')
      }

      setShowModal(false)
      setSelectedData('')
      setSelectedHora('')
      
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
            <h2>Agendamentos</h2>
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

      <div className="stats-grid agendamentos-stats-grid">
        {[{ s: 'Pendente', v: getCount('Pendente'), i: '' },
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

      <div className="agendamentos-filters">
        {statuses.map(s => (
          <button key={s} className={`btn ${filtroStatus === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFiltroStatus(s)}>{s}</button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p className="agendamentos-empty">A carregar agendamentos...</p>
        ) : filtered.length === 0 ? (
          <p className="agendamentos-empty">Nenhum agendamento encontrado.</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Cliente</th><th>Barbeiro</th><th>Serviço</th><th>Data/Hora</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text-muted)' }}>#{a.id}</td>
                    <td className="agendamentos-table-strong">{a.cliente_nome || `Cliente #${a.cliente_id}`}</td>
                    <td>{a.barbeiro_nome || `Barbeiro #${a.barbeiro_id}`}</td>
                    <td>{a.servico_nome || `Serviço #${a.servico_id}`}</td>
                    <td>{new Date(a.data_hora).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="agendamentos-table-strong">R$ {a.preco ? a.preco.toFixed(2) : '35.00'}</td>
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
                              Gorjeta
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
          <div className="modal" style={isClient ? { height: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' } : {}} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={isClient ? { flexShrink: 0 } : {}}>
              <h3>Novo Agendamento</h3>
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
                    <input
                      type="date"
                      className="form-input"
                      value={selectedData}
                      min={getLocalDateStr()}
                      onChange={e => handleDateChange(e.target.value)}
                      required
                    />
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

      {showToast && (
        <div className="toast">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
