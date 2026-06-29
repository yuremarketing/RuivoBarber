import React, { useState, useEffect, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import { fetchAgendaBarbeiro, criarAgendamento, fetchDisponibilidadeBarbeiro, fetchBloqueiosBarbeiro } from '../services/api.js'

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

export default function BookingWizard({ servicos, barbeiros, onClose, onSuccess }) {
  const [step, setStep] = useState(1)
  const [selectedServico, setSelectedServico] = useState(null)
  const [selectedBarbeiro, setSelectedBarbeiro] = useState(null)
  const [selectedData, setSelectedData] = useState('')
  const [selectedHora, setSelectedHora] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [barbeiroDisponibilidades, setBarbeiroDisponibilidades] = useState([])
  const [barbeiroBloqueios, setBarbeiroBloqueios] = useState([])

  const horizontalDays = useMemo(() => getHorizontalDays(), [])

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

  // Mapear fotos padrão (avatares RPG) se foto_url estiver vazia
  const getBarberPhoto = (barber) => {
    if (barber.foto_url && barber.foto_url.trim() !== '') {
      return barber.foto_url
    }
    const avatars = [
      '/avatars/viking.png',
      '/avatars/knight.png',
      '/avatars/wizard.png',
      '/avatars/cyborg.png'
    ]
    return avatars[barber.id % avatars.length]
  }

  // Renderizar estrelas baseado na avaliação média (máx 5)
  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<span key={i} style={{ color: 'var(--gold)' }}>★</span>)
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<span key={i} style={{ color: 'var(--gold)' }}>⯪</span>)
      } else {
        stars.push(<span key={i} style={{ color: 'var(--text-muted)' }}>★</span>)
      }
    }
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.9rem' }}>
        {stars}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>
          ({rating.toFixed(1)})
        </span>
      </div>
    )
  }

  // Carregar disponibilidade e bloqueios ao selecionar o barbeiro
  useEffect(() => {
    if (!selectedBarbeiro) {
      setBarbeiroDisponibilidades([])
      setBarbeiroBloqueios([])
      return
    }
    const loadBarberConfigs = async () => {
      try {
        const [resDisp, resBloq] = await Promise.all([
          fetchDisponibilidadeBarbeiro(selectedBarbeiro.id).catch(() => ({ data: [] })),
          fetchBloqueiosBarbeiro(selectedBarbeiro.id).catch(() => ({ data: [] }))
        ])
        setBarbeiroDisponibilidades(resDisp.data || [])
        setBarbeiroBloqueios(resBloq.data || [])
      } catch (err) {
        console.error("Erro ao buscar configurações do barbeiro no Wizard:", err)
      }
    }
    loadBarberConfigs()
  }, [selectedBarbeiro])

  // Carregar slots disponíveis quando barbeiro, data ou serviço mudam
  useEffect(() => {
    if (!selectedBarbeiro || !selectedData || !selectedServico) {
      setAvailableSlots([])
      return
    }

    const gerarSlotsMock = () => {
      const weekday = new Date(selectedData + 'T12:00:00').getDay()
      const disp = barbeiroDisponibilidades.find(d => d.dia_semana === weekday)
      
      let startHour = 9
      let startMin = 0
      let endHour = 19
      let endMin = 0
      
      if (disp && disp.hora_inicio && disp.hora_fim) {
        const [sh, sm] = disp.hora_inicio.split(':').map(Number)
        const [eh, em] = disp.hora_fim.split(':').map(Number)
        if (!isNaN(sh) && !isNaN(eh)) {
          startHour = sh
          startMin = sm || 0
          endHour = eh
          endMin = em || 0
        }
      }
      
      const slots = []
      let hour = startHour
      let min = startMin
      const endTotalMin = endHour * 60 + endMin
      
      while (hour * 60 + min < endTotalMin) {
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

    const loadSlots = async () => {
      setLoadingSlots(true)
      setError(null)
      try {
        const res = await fetchAgendaBarbeiro(selectedBarbeiro.id, selectedData, selectedServico.id)
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

    loadSlots()
  }, [selectedBarbeiro, selectedData, selectedServico, barbeiroDisponibilidades])

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

  const handleServiceSelect = (servico) => {
    setSelectedServico(servico)
    setStep(2)
  }

  const handleBarberSelect = (barbeiro) => {
    setSelectedBarbeiro(barbeiro)
    setStep(3)
  }

  const handleSlotSelect = (time) => {
    setSelectedHora(time)
    setStep(4)
  }

  const handleConfirm = async () => {
    if (!selectedServico || !selectedBarbeiro || !selectedData || !selectedHora) {
      setError('Por favor, preencha todas as seleções.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const dataHoraStr = `${selectedData} ${selectedHora}`
      await criarAgendamento(selectedBarbeiro.id, selectedServico.id, dataHoraStr)
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao realizar agendamento.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="booking-wizard-container">
      {/* Indicador de Etapas */}
      <div className="booking-wizard-steps">
        {[
          { num: 1, label: 'Serviço' },
          { num: 2, label: 'Barbeiro' },
          { num: 3, label: 'Horário' },
          { num: 4, label: 'Confirmar' }
        ].map(s => {
          const isActive = step === s.num
          const isDone = step > s.num
          return (
            <div key={s.num} className="booking-wizard-step" style={{ opacity: isActive || isDone ? 1 : 0.4 }}>
              <div className="booking-wizard-step-icon" style={{ backgroundColor: isDone ? 'var(--green)' : isActive ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)', boxShadow: isActive ? '0 0 10px var(--accent-glow)' : 'none' }}>
                {isDone ? '✓' : s.num}
              </div>
              <span className="booking-wizard-step-label" style={{ fontWeight: isActive ? 'bold' : 'normal', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.label}</span>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="banner error" style={{ marginBottom: '1.5rem', borderRadius: '10px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Conteúdo das Etapas */}
      <div className="booking-wizard-content">
        
        {/* ETAPA 1: SELECIONAR SERVIÇO */}
        {step === 1 && (
          <div className="fade-in-up">
            <h4 className="mb-1">Selecione o Serviço desejado:</h4>
            <div className="booking-service-grid">
              {servicos.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleServiceSelect(s)}
                  className="booking-service-card"
                >
                  <div>
                    <h5 className="booking-service-title">{s.nome}</h5>
                    <p className="booking-service-desc">
                      {s.duracaominutos} minutos
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="booking-service-xp">
                      +{s.xprecompensa} XP
                    </span>
                    <span className="booking-service-price">
                      R$ {s.preco.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ETAPA 2: SELECIONAR BARBEIRO */}
        {step === 2 && (
          <div className="fade-in-up">
            <h4 className="mb-1">Escolha um Barbeiro:</h4>
            <div className="booking-barber-grid">
              {barbeiros.map(b => (
                <div
                  key={b.id}
                  onClick={() => handleBarberSelect(b)}
                  className="booking-barber-card"
                >
                  <img
                    src={getBarberPhoto(b)}
                    alt={b.nome}
                    className="booking-barber-img"
                  />
                  <h5 className="booking-barber-name">{b.nome}</h5>
                  {renderStars(b.avaliacao_media || 5.0)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ETAPA 3: SELECIONAR DATA E HORA */}
        {step === 3 && (
          <div className="fade-in-up">
            <h4 className="mb-1">Escolha a Data e o Horário:</h4>
            
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

            <div className="form-group">
              <label className="form-label">Horários Disponíveis (Sessão de {selectedServico?.duracaominutos} min)</label>
              {!selectedData ? (
                <p className="text-secondary text-sm">
                  Por favor, selecione uma data no seletor acima para consultar os horários.
                </p>
              ) : loadingSlots ? (
                <p className="text-secondary text-sm">Consultando agenda do barbeiro...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-secondary text-sm">❌ Sem horários disponíveis para este dia.</p>
              ) : (
                <div className="booking-slots-grid">
                  {availableSlots.map(slot => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => handleSlotSelect(slot.time)}
                      className={`booking-slot-btn ${selectedHora === slot.time ? 'selected' : slot.available ? 'available' : ''}`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ETAPA 4: CONFIRMAÇÃO E RESUMO */}
        {step === 4 && (
          <div className="fade-in-up">
            <h4 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Resumo da Reserva:</h4>
            
            <div className="booking-summary-card">
              {/* Resumo do Serviço */}
              <div className="booking-summary-section">
                <div>
                  <div className="booking-summary-label">Serviço</div>
                  <div className="booking-summary-value">{selectedServico?.nome}</div>
                  <div className="booking-summary-sub">
                    Duração: {selectedServico?.duracaominutos} minutos
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="booking-summary-value" style={{ marginBottom: '4px' }}>
                    R$ {selectedServico?.preco.toFixed(2)}
                  </div>
                  <span className="booking-service-xp" style={{ padding: '0.2rem 0.4rem', fontSize: '0.68rem', border: 'none' }}>
                    +{selectedServico?.xprecompensa} XP
                  </span>
                </div>
              </div>

              {/* Resumo do Barbeiro */}
              <div className="booking-summary-section barber-section">
                <img src={getBarberPhoto(selectedBarbeiro)} alt={selectedBarbeiro?.nome} className="booking-barber-img" style={{ width: '45px', height: '45px', marginBottom: 0 }} />
                <div>
                  <div className="booking-summary-label">Barbeiro</div>
                  <div className="booking-summary-value" style={{ fontSize: '0.95rem' }}>{selectedBarbeiro?.nome}</div>
                  {selectedBarbeiro && renderStars(selectedBarbeiro.avaliacao_media || 5.0)}
                </div>
              </div>

              {/* Resumo da Data/Hora */}
              <div>
                <div className="booking-summary-label">Data e Horário</div>
                <div className="booking-summary-value" style={{ fontSize: '1rem', marginTop: '2px' }}>
                  {new Date(selectedData + 'T12:00:00').toLocaleDateString('pt-BR')} às {selectedHora}
                </div>
              </div>
            </div>


          </div>
        )}
      </div>

      {/* Controles de Navegação */}
      <div className="booking-controls">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (step > 1) {
              setStep(step - 1)
              setError(null)
            } else {
              onClose()
            }
          }}
        >
          {step > 1 ? '← Voltar' : 'Cancelar'}
        </button>

        {step < 4 ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              (step === 1 && !selectedServico) ||
              (step === 2 && !selectedBarbeiro) ||
              (step === 3 && (!selectedData || !selectedHora))
            }
            onClick={() => setStep(step + 1)}
          >
            Avançar →
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="btn btn-primary btn-booking-confirm"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            {submitting ? 'Confirmando...' : '⚡ Confirmar e Agendar'}
          </button>
        )}
      </div>
    </div>
  )
}

BookingWizard.propTypes = {
  servicos: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      nome: PropTypes.string.isRequired,
      preco: PropTypes.number,
      duracao: PropTypes.number
    })
  ).isRequired,
  barbeiros: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      nome: PropTypes.string.isRequired
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired
}

