import React, { useState, useEffect } from 'react'
import { Server, Database, Activity, Radio, RefreshCw } from 'lucide-react'
import api from '../services/api'

export default function OperationsPage() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/ops/status')
      setStatus(res.data)
    } catch (err) {
      setError(err.message || 'Erro ao carregar status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const getStatusColor = (val) => val === 'healthy' ? '#2ecc71' : '#e74c3c'
  const getStatusText = (val) => val === 'healthy' ? 'Operacional' : 'Degradado'

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Centro de Operações</h1>
        <button className="btn btn-primary" onClick={fetchStatus} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} />
          Atualizar
        </button>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {loading && !status ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando métricas...</div>
      ) : status ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          
          <div className="dashboard-card" style={{ borderLeft: `4px solid ${getStatusColor(status.api)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#8f98a5' }}>API Geral</h3>
              <Server size={24} color={getStatusColor(status.api)} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getStatusColor(status.api) }}>
              {getStatusText(status.api)}
            </div>
          </div>

          <div className="dashboard-card" style={{ borderLeft: `4px solid ${getStatusColor(status.database)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#8f98a5' }}>Banco de Dados</h3>
              <Database size={24} color={getStatusColor(status.database)} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getStatusColor(status.database) }}>
              {getStatusText(status.database)}
            </div>
          </div>

          <div className="dashboard-card" style={{ borderLeft: `4px solid ${getStatusColor(status.worker)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#8f98a5' }}>Worker RPG</h3>
              <Activity size={24} color={getStatusColor(status.worker)} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getStatusColor(status.worker) }}>
              {getStatusText(status.worker)}
            </div>
          </div>

          <div className="dashboard-card" style={{ borderLeft: `4px solid ${getStatusColor(status.sse)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#8f98a5' }}>SSE Hub</h3>
              <Radio size={24} color={getStatusColor(status.sse)} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: getStatusColor(status.sse) }}>
              {getStatusText(status.sse)}
            </div>
          </div>

          <div className="dashboard-card" style={{ gridColumn: '1 / -1', background: '#161a24' }}>
            <h3 style={{ color: '#8f98a5', marginBottom: '1rem' }}>Metadados do Sistema</h3>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <strong style={{ color: '#d4b26f' }}>Versão:</strong> <span style={{ color: '#fff' }}>{status.version}</span>
              </div>
              <div>
                <strong style={{ color: '#d4b26f' }}>Última Atualização:</strong> <span style={{ color: '#fff' }}>{new Date(status.timestamp).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  )
}
