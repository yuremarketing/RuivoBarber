import React, { useState, useEffect, useMemo, useRef } from 'react'
import { fetchServicos, fetchBarbeiros, fetchAgendamentos, fetchAgendaBarbeiro, criarAgendamento, concluirAtendimento, registrarFalta, fetchDisponibilidadeBarbeiro, fetchBloqueiosBarbeiro } from '../services/api.js'

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
  const [step, setStep] = useState(1)

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
                  
                  <div className="form-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Data do Agendamento</span>
                      {selectedData && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--primary-color, #e07a5f)', fontWeight: '600' }}>
                          {(() => {
                            const [y, m, d] = selectedData.split('-');
                            return `${d}/${m}/${y}`;
                          })()}
                        </span>
                      )}
                    </label>
                    <div 
                      ref={datePickerRef}
                      className="horizontal-date-picker"
                      onMouseDown={handleMouseDownDate}
                      onMouseLeave={handleMouseLeaveDate}
                      onMouseUp={handleMouseUpDate}
                      onMouseMove={handleMouseMoveDate}
                    >
                      {horizontalDays.map(d => {
                        const isSelected = selectedData === d.dateStr;
                        
                        // Check if barber is available or blocked
                        const [year, month, day] = d.dateStr.split('-').map(Number);
                        const dateObj = new Date(year, month - 1, day);
                        const weekday = dateObj.getDay();
                        const disp = barbeiroDisponibilidades.find(x => x.dia_semana === weekday);
                        const isBlocked = barbeiroBloqueios.some(b => b.data_bloqueio === d.dateStr);
                        const isDisabled = (disp && !disp.trabalha) || isBlocked;
                        
                        return (
                          <div
                            key={d.dateStr}
                            onClick={() => {
                              if (isDraggingDate) return;
                              handleDateChange(d.dateStr);
                            }}
                            className={`date-picker-card${isSelected ? ' selected' : ''}${isDisabled ? ' disabled' : ''}`}
                            title={isDisabled ? 'Barbeiro indisponível' : ''}
                          >
                            <span className="weekday">{d.dayName}</span>
                            <span className="day-val">{d.dayVal}</span>
                            <span className="month-val">{d.monthName}</span>
                          </div>
                        );
                      })}
                    </div>
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

      {showToast && (
        <div className="toast">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
