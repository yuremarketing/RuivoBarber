import React, { useState, useEffect } from 'react'
import { fetchAgendamentos, fetchBarbeiros } from '../services/api.js'
import ErrorState from './ErrorState.jsx'

export default function AgendaConsolidada() {
  const [dataSelecionada, setDataSelecionada] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  })
  
  const [agendamentos, setAgendamentos] = useState([])
  const [barbeiros, setBarbeiros] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true)
      setError(null)
      try {
        const [resBarbeiros, resAgendamentos] = await Promise.all([
          fetchBarbeiros(),
          fetchAgendamentos(dataSelecionada) // We need to update fetchAgendamentos in api.js to accept data
        ])
        setBarbeiros(resBarbeiros.data || [])
        setAgendamentos(resAgendamentos.data || [])
      } catch (err) {
        setError('Erro ao carregar a agenda consolidada.')
      } finally {
        setLoading(false)
      }
    }
    carregarDados()
  }, [dataSelecionada])

  // Agrupar agendamentos por barbeiro_id
  const agendamentosPorBarbeiro = agendamentos.reduce((acc, curr) => {
    if (!acc[curr.barbeiro_id]) {
      acc[curr.barbeiro_id] = []
    }
    acc[curr.barbeiro_id].push(curr)
    return acc
  }, {})

  // Ordernar barbeiros (opcional)
  const barbeirosOrdenados = [...barbeiros].sort((a, b) => a.nome.localeCompare(b.nome))

  const formatHora = (dataHoraStr) => {
    const d = new Date(dataHoraStr)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmado': return 'var(--primary)'
      case 'Pendente': return '#f39c12'
      case 'Concluído': return 'var(--success)'
      case 'Cancelado': return 'var(--danger)'
      case 'Falta': return '#95a5a6'
      case 'Check-in': return '#9b59b6'
      case 'Em Cadeira': return '#3498db'
      default: return 'var(--text-muted)'
    }
  }

  return (
    <div className="card fade-in-up" style={{ padding: '20px' }}>
      <div className="agenda-consol-header">
        <h3>Agenda Consolidada</h3>
        <input 
          type="date" 
          className="input agenda-consol-input" 
          value={dataSelecionada} 
          onChange={e => setDataSelecionada(e.target.value)} 
        />
      </div>

      {error && <ErrorState message={error} onRetry={() => setDataSelecionada(dataSelecionada)} />}

      {loading ? (
        <p>Carregando colunas...</p>
      ) : (
        <div className="agenda-consol-columns">
          {barbeirosOrdenados.length > 0 ? (
            barbeirosOrdenados.map(b => (
              <div key={b.id} className="agenda-consol-barbeiro-col">
                <h4 className="agenda-consol-barbeiro-name">
                  {b.nome}
                </h4>
                
                <div className="agenda-consol-slots">
                  {agendamentosPorBarbeiro[b.id] && agendamentosPorBarbeiro[b.id].length > 0 ? (
                    agendamentosPorBarbeiro[b.id].sort((a1, a2) => new Date(a1.data_hora) - new Date(a2.data_hora)).map(ag => (
                      <div key={ag.id} className="agenda-consol-slot" style={{ borderLeft: `4px solid ${getStatusColor(ag.status)}` }}>
                        <div className="agenda-consol-slot-header">
                          <span className="agenda-consol-slot-hora">{formatHora(ag.data_hora)}</span>
                          <span className="agenda-consol-slot-status" style={{ color: getStatusColor(ag.status) }}>
                            {ag.status}
                          </span>
                        </div>
                        <div className="agenda-consol-slot-cliente">{ag.nome_cliente || `Cliente #${ag.cliente_id}`}</div>
                        <div className="agenda-consol-slot-servico">{ag.nome_servico || `Serviço #${ag.servico_id}`}</div>
                      </div>
                    ))
                  ) : (
                    <p className="agenda-consol-livre">Livre</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="agenda-consol-vazio">Nenhum barbeiro encontrado.</p>
          )}
        </div>
      )}
    </div>
  )
}
