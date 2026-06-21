import React, { useState, useEffect } from 'react'
import { fetchAgendaBarbeiro, criarAgendamento } from '../services/api.js'

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

  // Carregar slots disponíveis quando barbeiro, data ou serviço mudam
  useEffect(() => {
    if (!selectedBarbeiro || !selectedData || !selectedServico) {
      setAvailableSlots([])
      return
    }

    const loadSlots = async () => {
      setLoadingSlots(true)
      setError(null)
      try {
        const res = await fetchAgendaBarbeiro(selectedBarbeiro.id, selectedData, selectedServico.id)
        setAvailableSlots(res.data || [])
      } catch (err) {
        console.error(err)
        setError('Erro ao carregar horários disponíveis.')
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadSlots()
  }, [selectedBarbeiro, selectedData, selectedServico])

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
    <div style={{ padding: '0.5rem 0' }}>
      {/* Indicador de Etapas */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '0.75rem',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {[
          { num: 1, label: 'Serviço' },
          { num: 2, label: 'Barbeiro' },
          { num: 3, label: 'Horário' },
          { num: 4, label: 'Confirmar' }
        ].map(s => {
          const isActive = step === s.num
          const isDone = step > s.num
          return (
            <div key={s.num} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: isActive || isDone ? 1 : 0.4,
              transition: 'opacity 0.3s ease'
            }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDone ? 'var(--green)' : isActive ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                boxShadow: isActive ? '0 0 10px var(--accent-glow)' : 'none'
              }}>
                {isDone ? '✓' : s.num}
              </div>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: isActive ? 'bold' : 'normal',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
              }}>{s.label}</span>
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
      <div style={{ minHeight: '300px' }}>
        
        {/* ETAPA 1: SELECIONAR SERVIÇO */}
        {step === 1 && (
          <div className="fade-in-up">
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Selecione o Serviço desejado:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              {servicos.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleServiceSelect(s)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  className="card-hover-effect"
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div>
                    <h5 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{s.nome}</h5>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      ⏱️ {s.duracaominutos} minutos
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{
                      backgroundColor: 'var(--gold-glow)',
                      color: 'var(--gold)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      border: '1px solid rgba(245, 166, 35, 0.2)'
                    }}>
                      +{s.xprecompensa} XP
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
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
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Escolha um Barbeiro:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {barbeiros.map(b => (
                <div
                  key={b.id}
                  onClick={() => handleBarberSelect(b)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '1.25rem',
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                    e.currentTarget.style.transform = 'translateY(-3px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <img
                    src={getBarberPhoto(b)}
                    alt={b.nome}
                    style={{
                      width: '75px',
                      height: '75px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid var(--border)',
                      marginBottom: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.03)'
                    }}
                  />
                  <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{b.nome}</h5>
                  {renderStars(b.avaliacao_media || 5.0)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ETAPA 3: SELECIONAR DATA E HORA */}
        {step === 3 && (
          <div className="fade-in-up">
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Escolha a Data e o Horário:</h4>
            
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Data do Agendamento</label>
              <input
                type="date"
                className="form-input"
                value={selectedData}
                onChange={e => {
                  setSelectedData(e.target.value)
                  setSelectedHora('')
                }}
                required
                style={{ maxWidth: '300px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Horários Disponíveis (Sessão de {selectedServico?.duracaominutos} min)</label>
              {!selectedData ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  📅 Por favor, selecione uma data no seletor acima para consultar os horários.
                </p>
              ) : loadingSlots ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>⏳ Consultando agenda do barbeiro...</p>
              ) : availableSlots.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>❌ Sem horários disponíveis para este dia.</p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
                  gap: '0.5rem',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.15)'
                }}>
                  {availableSlots.map(slot => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => handleSlotSelect(slot.time)}
                      style={{
                        padding: '0.5rem 0.25rem',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: selectedHora === slot.time
                          ? 'var(--accent)'
                          : slot.available
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'transparent',
                        backgroundColor: selectedHora === slot.time
                          ? 'var(--accent)'
                          : slot.available
                            ? 'rgba(255, 255, 255, 0.04)'
                            : 'rgba(255, 255, 255, 0.01)',
                        color: selectedHora === slot.time
                          ? '#fff'
                          : slot.available
                            ? 'var(--text-primary)'
                            : 'var(--text-muted)',
                        cursor: slot.available ? 'pointer' : 'not-allowed',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        textDecoration: slot.available ? 'none' : 'line-through',
                        transition: 'all 0.15s ease',
                      }}
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
            
            <div style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              marginBottom: '2rem'
            }}>
              {/* Resumo do Serviço */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Serviço</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedServico?.nome}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    ⏱️ Duração: {selectedServico?.duracaominutos} minutos
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    R$ {selectedServico?.preco.toFixed(2)}
                  </div>
                  <span style={{
                    backgroundColor: 'var(--gold-glow)',
                    color: 'var(--gold)',
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 'bold',
                  }}>
                    +{selectedServico?.xprecompensa} XP
                  </span>
                </div>
              </div>

              {/* Resumo do Barbeiro */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                <img
                  src={getBarberPhoto(selectedBarbeiro)}
                  alt={selectedBarbeiro?.nome}
                  style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Barbeiro</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedBarbeiro?.nome}</div>
                  {selectedBarbeiro && renderStars(selectedBarbeiro.avaliacao_media || 5.0)}
                </div>
              </div>

              {/* Resumo da Data/Hora */}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold' }}>Data e Horário</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>
                  📅 {new Date(selectedData + 'T12:00:00').toLocaleDateString('pt-BR')} às {selectedHora}
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '1rem',
                fontWeight: 'bold',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px var(--accent-glow)'
              }}
            >
              {submitting ? 'Confirmando Agendamento...' : '⚡ Confirmar e Agendar'}
            </button>
          </div>
        )}
      </div>

      {/* Controles de Navegação */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '2rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        paddingTop: '1rem'
      }}>
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

        {step < 4 && (
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
        )}
      </div>
    </div>
  )
}
