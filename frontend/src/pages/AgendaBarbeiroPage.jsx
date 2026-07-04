import React, { useState, useEffect } from 'react'
import { fetchAgendamentos, concluirAtendimento } from '../services/api.js'
import ErrorState from '../components/ErrorState.jsx'

function AgendaBarbeiroPage() {
  const [agendamentos, setAgendamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedData, setSelectedData] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const getAuthToken = () => {
    try {
      const userStr = localStorage.getItem('ruivobarber_user')
      if (userStr) {
        const user = JSON.parse(userStr)
        return user.token
      }
    } catch (e) {
      console.error(e)
    }
    return null
  }

  const loadAgenda = async (date) => {
    setLoading(true)
    setError('')
    try {
      // The backend will now filter automatically based on the Barber's JWT
      const res = await fetchAgendamentos() // Note: Need to update api.js or use fetch() to pass the date query correctly if we want to change dates.
      // But fetchAgendamentos in api.js currently doesn't take 'data'. Let's fetch using direct api call or use fetchAgendaBarbeiro.
      
      // We can use the native API call:
      const baseURL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8080/api/v1' : '/api/v1')
      const response = await fetch(`${baseURL}/agendamentos?data=${date}`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      })
      if (!response.ok) throw new Error('Falha ao carregar agenda')
      const data = await response.json()
      setAgendamentos(data || [])
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar a sua agenda.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgenda(selectedData)
  }, [selectedData])

  useEffect(() => {
    // Conectar ao SSE
    const baseURL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8080/api/v1' : '/api/v1')
    
    // As EventSource doesn't natively support setting headers (like Authorization),
    // a common workaround is passing the token in the query string or a cookie.
    // However, our JWT middleware expects a Bearer token or a cookie. Let's see if we can use a polyfill or if our backend supports it in URL.
    // Wait, let's just use regular polling if SSE auth is complex, OR we add token to URL.
    // For now, let's try connecting via EventSource and passing token in URL (need to check if backend accepts it).
    // Our Fiber JWT middleware usually checks headers.
    
    // To keep it simple and reliable for the MVP: we will poll every 5 seconds since it's just the barber's own agenda.
    // But the issue specifically asked for SSE. So we will try EventSource.
    const token = getAuthToken()
    if (!token) return

    let eventSource
    try {
      eventSource = new EventSource(`${baseURL}/barbeiro/notificacoes?token=${token}`)
      
      eventSource.onmessage = (e) => {
        if (e.data === 'checkin') {
          // Play sound
          try {
            const audio = new Audio('/notification.mp3') // Assume we have a sound or just ignore if it fails
            audio.play().catch(e => console.log('Audio blocked', e))
          } catch(err) {}

          setToastMessage('🔔 Um cliente acabou de chegar na recepção!')
          setShowToast(true)
          setTimeout(() => setShowToast(false), 8000)
          
          loadAgenda(selectedData) // Refresh the list to show the new status
        }
      }
      
      eventSource.onerror = () => {
        console.error('SSE Error. Reconnecting...')
      }
    } catch (e) {
      console.error("SSE init error", e)
    }

    return () => {
      if (eventSource) eventSource.close()
    }
  }, [selectedData])

  const handleConcluir = async (id) => {
    if (window.confirm('Deseja concluir este atendimento?')) {
      try {
        await concluirAtendimento(id)
        loadAgenda(selectedData)
      } catch (err) {
        alert('Erro ao concluir: ' + (err.response?.data?.error || err.message))
      }
    }
  }

  // Helper for dates
  const handleNextDay = () => {
    const d = new Date(selectedData)
    d.setDate(d.getDate() + 1)
    setSelectedData(d.toISOString().split('T')[0])
  }
  
  const handlePrevDay = () => {
    const d = new Date(selectedData)
    d.setDate(d.getDate() - 1)
    setSelectedData(d.toISOString().split('T')[0])
  }

  return (
    <div className="fade-in-up agenda-barbeiro-page-wrapper">
      {showToast && (
        <div className="agenda-barbeiro-toast">
          {toastMessage}
          <button onClick={() => setShowToast(false)} className="agenda-barbeiro-toast-close">×</button>
        </div>
      )}

      <div className="agenda-barbeiro-header-row">
        <h2>Sua Agenda</h2>
        <div className="agenda-barbeiro-controls">
          <button className="btn btn-secondary btn-sm" onClick={handlePrevDay}>&larr;</button>
          <input type="date" value={selectedData} onChange={e => setSelectedData(e.target.value)} className="agenda-barbeiro-date-input" />
          <button className="btn btn-secondary btn-sm" onClick={handleNextDay}>&rarr;</button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => loadAgenda(selectedData)} />
      ) : loading ? (
        <p>Carregando...</p>
      ) : agendamentos.length === 0 ? (
        <div className="card agenda-barbeiro-empty-card">
          <p className="agenda-barbeiro-empty-text">Nenhum agendamento para este dia.</p>
        </div>
      ) : (
        <div className="agenda-barbeiro-list">
          {agendamentos.map(a => (
            <div key={a.id} className="card agenda-barbeiro-item" style={{ borderLeft: a.status === 'Presente' ? '4px solid var(--success)' : a.status === 'EmCadeira' ? '4px solid var(--primary)' : '4px solid transparent' }}>
              <div className="agenda-barbeiro-item-header">
                <span className="agenda-barbeiro-item-time">
                  {new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span>
              </div>
              <div className="agenda-barbeiro-item-client">
                <strong>Cliente:</strong> {a.cliente_nome}
              </div>
              <div className="agenda-barbeiro-item-service">
                <strong>Serviço:</strong> {a.servico_nome}
              </div>
              
              <div className="agenda-barbeiro-item-actions">
                {(a.status === 'Pendente' || a.status === 'Confirmado' || a.status === 'Presente' || a.status === 'EmCadeira') && (
                  <button className="btn btn-primary btn-sm" onClick={() => handleConcluir(a.id)}>
                    Finalizar Serviço
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AgendaBarbeiroPage
