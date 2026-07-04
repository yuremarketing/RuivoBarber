import React, { useState, useEffect } from 'react'
import { fetchBarbeiros, fetchDisponibilidadeBarbeiro, salvarDisponibilidadeBarbeiro, fetchBloqueiosBarbeiro, adicionarBloqueioBarbeiro, removerBloqueioBarbeiro, salvarChavePixBarbeiro } from '../services/api.js'

const DIAS_SEMANA_NOMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
]

const getLocalDateStr = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AgendaConfigPage() {
  const userSessionStr = localStorage.getItem('ruivobarber_user')
  const session = userSessionStr ? JSON.parse(userSessionStr) : null
  const user = session?.user || session // Compatibilidade com diferentes formatos de sessão
  const isBarber = user?.cargo === 'Barbeiro'
  const isAdmin = user?.cargo === 'Adm'
  const isAuthorized = isAdmin || isBarber

  const [barbeiros, setBarbeiros] = useState([])
  const [selectedBarbeiroId, setSelectedBarbeiroId] = useState('')
  const [disponibilidade, setDisponibilidade] = useState([])
  const [bloqueios, setBloqueios] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastType, setToastType] = useState('success') // success, error
  const [showToast, setShowToast] = useState(false)

  // Form states for new block
  const [novaData, setNovaData] = useState('')
  const [novoMotivo, setNovoMotivo] = useState('')
  const [chavePix, setChavePix] = useState('')
  const [loadingPix, setLoadingPix] = useState(false)
  const [novaHoraInicio, setNovaHoraInicio] = useState('')
  const [novaHoraFim, setNovaHoraFim] = useState('')

  const triggerToast = (msg, type = 'success') => {
    setToastMsg(msg)
    setToastType(type)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  // Load barbers if Authorized (Admin or Barber)
  useEffect(() => {
    if (!isAuthorized) return

    const loadBarbeiros = async () => {
      setLoading(true)
      try {
        const res = await fetchBarbeiros()
        const list = res.data || []
        setBarbeiros(list)
        if (isAdmin && list.length > 0) {
          setSelectedBarbeiroId(list[0].id)
        } else if (isBarber) {
          setSelectedBarbeiroId(user.id)
        }
      } catch (err) {
        console.error('Erro ao buscar barbeiros:', err)
        triggerToast('Erro ao carregar lista de barbeiros.', 'error')
      } finally {
        setLoading(false)
      }
    }
    loadBarbeiros()
  }, [isAdmin, isBarber, isAuthorized, user?.id])

  useEffect(() => {
    if (selectedBarbeiroId && barbeiros.length > 0) {
      const current = barbeiros.find(b => b.id === Number(selectedBarbeiroId))
      if (current) {
        setChavePix(current.chave_pix || '')
      } else {
        setChavePix('')
      }
    }
  }, [selectedBarbeiroId, barbeiros])

  const handleSaveChavePix = async (e) => {
    e.preventDefault()
    if (!selectedBarbeiroId) return
    setLoadingPix(true)
    try {
      await salvarChavePixBarbeiro(selectedBarbeiroId, chavePix)
      triggerToast('Chave Pix de gorjetas salva com sucesso!')
      setBarbeiros(prev => prev.map(b => b.id === Number(selectedBarbeiroId) ? { ...b, chave_pix: chavePix } : b))
    } catch (err) {
      console.error(err)
      triggerToast('Erro ao salvar Chave Pix: ' + (err.response?.data?.error || err.message), 'error')
    } finally {
      setLoadingPix(false)
    }
  }

  // Load selected barber's schedule and blocks
  const loadBarberData = async (barberId) => {
    if (!barberId) return
    setLoadingConfig(true)
    try {
      const [resDisp, resBloq] = await Promise.all([
        fetchDisponibilidadeBarbeiro(barberId),
        fetchBloqueiosBarbeiro(barberId)
      ])
      setDisponibilidade(resDisp.data || [])
      setBloqueios(resBloq.data || [])
    } catch (err) {
      console.error('Erro ao buscar dados do barbeiro:', err)
      triggerToast('Erro ao carregar escala/bloqueios do barbeiro.', 'error')
    } finally {
      setLoadingConfig(false)
    }
  }

  useEffect(() => {
    if (selectedBarbeiroId) {
      loadBarberData(selectedBarbeiroId)
    }
  }, [selectedBarbeiroId])

  const handleDispChange = (index, field, value) => {
    const updated = [...disponibilidade]
    updated[index] = { ...updated[index], [field]: value }
    setDisponibilidade(updated)
  }

  const handleSaveDisponibilidade = async (e) => {
    e.preventDefault()
    if (!selectedBarbeiroId) return
    setLoading(true)
    try {
      await salvarDisponibilidadeBarbeiro(selectedBarbeiroId, disponibilidade)
      triggerToast('Escala semanal atualizada com sucesso!')
      loadBarberData(selectedBarbeiroId)
    } catch (err) {
      console.error(err)
      triggerToast('Erro ao salvar escala de trabalho: ' + (err.response?.data?.error || err.message), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBloqueio = async (e) => {
    e.preventDefault()
    if (!selectedBarbeiroId || !novaData) {
      triggerToast('Selecione uma data para bloquear.', 'error')
      return
    }

    try {
      await adicionarBloqueioBarbeiro(selectedBarbeiroId, novaData, novaHoraInicio, novaHoraFim, novoMotivo)
      triggerToast('Bloqueio adicionado com sucesso!')
      setNovaData('')
      setNovoMotivo('')
      setNovaHoraInicio('')
      setNovaHoraFim('')
      loadBarberData(selectedBarbeiroId)
    } catch (err) {
      console.error(err)
      triggerToast('Erro ao bloquear: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  const handleRemoveBloqueio = async (date) => {
    if (!selectedBarbeiroId) return
    if (!window.confirm(`Deseja remover o bloqueio para a data ${date}?`)) return

    try {
      await removerBloqueioBarbeiro(selectedBarbeiroId, date)
      triggerToast('Bloqueio removido com sucesso!')
      loadBarberData(selectedBarbeiroId)
    } catch (err) {
      console.error(err)
      triggerToast('Erro ao remover bloqueio: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  if (!isAuthorized) {
    return (
      <div className="agenda-config-unauth">
        <h2>⚠️ Acesso Não Autorizado</h2>
        <p className="agenda-config-unauth-text">Você não possui permissões para gerenciar escalas de barbeiros.</p>
      </div>
    )
  }

  return (
    <div className="fade-in-up">
      {/* Toast Alert */}
      {showToast && (
        <div 
          className="agenda-config-toast"
          style={{ backgroundColor: toastType === 'success' ? '#2ec4b6' : '#e71d36' }}
        >
          {toastMsg}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>Escala e Disponibilidade</h2>
            <p>Defina seus dias de atendimento, horários de expediente e bloqueios de férias/folgas</p>
          </div>
        </div>
      </div>

      {/* Admin Barber Selector */}
      {isAdmin && (
        <div className="card agenda-config-barber-card">
          <div className="form-group agenda-config-barber-form">
            <label className="form-label agenda-config-barber-label">Selecione o Barbeiro:</label>
            <select
              className="form-input agenda-config-barber-select"
              value={selectedBarbeiroId}
              onChange={(e) => setSelectedBarbeiroId(Number(e.target.value))}
            >
              {barbeiros.map(b => (
                <option key={b.id} value={b.id}>{b.nome}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loadingConfig ? (
        <p className="agenda-config-loading">Carregando dados da agenda...</p>
      ) : (
        <div className="agenda-config-grid">
          
          {/* Escala Semanal Card */}
          <div className="card">
            <div className="card-header mb-1">
              <h3>Horários de Expediente Semanal</h3>
            </div>
            <form onSubmit={handleSaveDisponibilidade}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dia da Semana</th>
                      <th>Atende?</th>
                      <th>Início</th>
                      <th>Término</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disponibilidade.map((d, index) => (
                      <tr key={d.dia_semana} style={{ opacity: d.trabalha ? 1 : 0.5 }}>
                        <td className="agenda-config-table-td">{DIAS_SEMANA_NOMES[d.dia_semana]}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={d.trabalha}
                            onChange={(e) => handleDispChange(index, 'trabalha', e.target.checked)}
                            className="agenda-config-checkbox"
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            className="form-input agenda-config-time"
                            value={d.hora_inicio || '09:00'}
                            disabled={!d.trabalha}
                            onChange={(e) => handleDispChange(index, 'hora_inicio', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            className="form-input agenda-config-time"
                            value={d.hora_fim || '19:00'}
                            disabled={!d.trabalha}
                            onChange={(e) => handleDispChange(index, 'hora_fim', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="submit"
                className="btn btn-primary agenda-config-save-btn"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Alterações da Escala'}
              </button>
            </form>
          </div>

          {/* Bloqueios e Folgas Card */}
          <div className="agenda-config-right-col">
            
            {/* Configuração de Chave Pix para Gorjetas */}
            <div className="card">
              <div className="card-header mb-1">
                <h3>🔑 Recebimento de Gorjetas (Pix)</h3>
              </div>
              <form onSubmit={handleSaveChavePix} className="agenda-config-form-col">
                <div className="form-group agenda-config-form-left">
                  <label className="form-label">Chave Pix do Barbeiro</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: CPF, E-mail, Celular ou Chave Aleatória"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    required
                  />
                  <small className="agenda-config-hint">
                    Esta chave será utilizada para gerar o QR Code de gorjetas digitais Pix para os clientes.
                  </small>
                </div>
                <button type="submit" className="btn btn-primary agenda-config-btn-full" disabled={loadingPix}>
                  {loadingPix ? 'Salvar...' : 'Salvar Chave Pix'}
                </button>
              </form>
            </div>
            
            {/* Adicionar Bloqueio */}
            <div className="card">
              <div className="card-header mb-1">
                <h3>🚫 Bloquear Data / Folga</h3>
              </div>
              <form onSubmit={handleAddBloqueio} className="agenda-config-form-col">
                <div className="form-group agenda-config-form-left">
                  <label className="form-label">Data de Bloqueio</label>
                  <input
                    type="date"
                    className="form-input"
                    value={novaData}
                    min={getLocalDateStr()}
                    onChange={(e) => setNovaData(e.target.value)}
                    required
                  />
                </div>
                
                <div className="agenda-config-time-row">
                  <div className="form-group agenda-config-time-col">
                    <label className="form-label">Início (Opcional)</label>
                    <input
                      type="time"
                      className="form-input"
                      value={novaHoraInicio}
                      onChange={(e) => setNovaHoraInicio(e.target.value)}
                    />
                  </div>
                  <div className="form-group agenda-config-time-col">
                    <label className="form-label">Término (Opcional)</label>
                    <input
                      type="time"
                      className="form-input"
                      value={novaHoraFim}
                      onChange={(e) => setNovaHoraFim(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group agenda-config-form-left">
                  <label className="form-label">Motivo (Feriado, Férias, Folga...)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Feriado de Tiradentes"
                    value={novoMotivo}
                    onChange={(e) => setNovoMotivo(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary agenda-config-btn-full">
                  Adicionar Bloqueio
                </button>
              </form>
            </div>

            {/* Listagem de Bloqueios */}
            <div className="card">
              <div className="card-header mb-1">
                <h3>📋 Bloqueios Ativos</h3>
              </div>
              {bloqueios.length === 0 ? (
                <p className="agenda-config-blocks-empty">
                  Nenhum bloqueio cadastrado para este barbeiro.
                </p>
              ) : (
                <div className="agenda-config-blocks-list">
                  {bloqueios.map(b => (
                    <div
                      key={b.id || `${b.data_bloqueio}_${b.hora_inicio || ''}`}
                      className="agenda-config-block-item"
                    >
                      <div className="agenda-config-block-left">
                        <div className="agenda-config-block-date">
                          {new Date(b.data_bloqueio + 'T00:00:00').toLocaleDateString('pt-BR')}
                          {b.hora_inicio && b.hora_fim && ` (${b.hora_inicio} - ${b.hora_fim})`}
                        </div>
                        <div className="agenda-config-block-reason">
                          {b.motivo || (b.hora_inicio ? 'Intervalo pontual' : 'Folga pontual')}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm agenda-config-block-remove"
                        title="Remover Bloqueio"
                        onClick={() => handleRemoveBloqueio(b.data_bloqueio)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  )
}
