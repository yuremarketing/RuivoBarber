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
      await adicionarBloqueioBarbeiro(selectedBarbeiroId, novaData, novoMotivo)
      triggerToast('Dia bloqueado com sucesso!')
      setNovaData('')
      setNovoMotivo('')
      loadBarberData(selectedBarbeiroId)
    } catch (err) {
      console.error(err)
      triggerToast('Erro ao bloquear dia: ' + (err.response?.data?.error || err.message), 'error')
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
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>⚠️ Acesso Não Autorizado</h2>
        <p style={{ color: 'var(--text-muted)' }}>Você não possui permissões para gerenciar escalas de barbeiros.</p>
      </div>
    )
  }

  return (
    <div className="fade-in-up">
      {/* Toast Alert */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'success' ? '#2ec4b6' : '#e71d36',
          color: '#fff',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: '600',
          transition: 'all 0.3s ease'
        }}>
          {toastMsg}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>⚙️ Escala e Disponibilidade</h2>
            <p>Defina seus dias de atendimento, horários de expediente e bloqueios de férias/folgas</p>
          </div>
        </div>
      </div>

      {/* Admin Barber Selector */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
          <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Selecione o Barbeiro:</label>
            <select
              className="form-input"
              style={{ maxWidth: '300px' }}
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
        <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando dados da agenda...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
          
          {/* Escala Semanal Card */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3>📅 Horários de Expediente Semanal</h3>
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
                        <td style={{ fontWeight: '600' }}>{DIAS_SEMANA_NOMES[d.dia_semana]}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={d.trabalha}
                            onChange={(e) => handleDispChange(index, 'trabalha', e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            className="form-input"
                            style={{ padding: '0.25rem 0.5rem', width: '100px' }}
                            value={d.hora_inicio || '09:00'}
                            disabled={!d.trabalha}
                            onChange={(e) => handleDispChange(index, 'hora_inicio', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="time"
                            className="form-input"
                            style={{ padding: '0.25rem 0.5rem', width: '100px' }}
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
                className="btn btn-primary"
                style={{ marginTop: '1.5rem', width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Alterações da Escala'}
              </button>
            </form>
          </div>

          {/* Bloqueios e Folgas Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Configuração de Chave Pix para Gorjetas */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '1rem' }}>
                <h3>🔑 Recebimento de Gorjetas (Pix)</h3>
              </div>
              <form onSubmit={handleSaveChavePix} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label">Chave Pix do Barbeiro</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: CPF, E-mail, Celular ou Chave Aleatória"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Esta chave será utilizada para gerar o QR Code de gorjetas digitais Pix para os clientes.
                  </small>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingPix}>
                  {loadingPix ? 'Salvar...' : 'Salvar Chave Pix'}
                </button>
              </form>
            </div>
            
            {/* Adicionar Bloqueio */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '1rem' }}>
                <h3>🚫 Bloquear Data / Folga</h3>
              </div>
              <form onSubmit={handleAddBloqueio} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ textAlign: 'left' }}>
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
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label">Motivo (Feriado, Férias, Folga...)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Feriado de Tiradentes"
                    value={novoMotivo}
                    onChange={(e) => setNovoMotivo(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                  Adicionar Bloqueio
                </button>
              </form>
            </div>

            {/* Listagem de Bloqueios */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '1rem' }}>
                <h3>📋 Bloqueios Ativos</h3>
              </div>
              {bloqueios.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                  Nenhum bloqueio cadastrado para este barbeiro.
                </p>
              ) : (
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {bloqueios.map(b => (
                    <div
                      key={b.data_bloqueio}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        marginBottom: '0.5rem'
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                          {new Date(b.data_bloqueio + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {b.motivo || 'Folga pontual'}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#e71d36' }}
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
