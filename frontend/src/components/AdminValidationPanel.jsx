import React, { useEffect, useState } from 'react'
import { listarClientes } from '../services/api.js'

function AdminValidationPanel() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    listarClientes()
      .then(res => {
        setClientes(res.data || [])
        setError(null)
      })
      .catch(err => {
        console.error(err)
        setError('Ocorreu um erro ao conectar ao servidor. Por favor, verifique a conexão ou as configurações de CORS.')
        setClientes([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: '600px', background: '#16213e', padding: '1rem', borderRadius: '10px', border: '1px solid #0f3460' }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>🛡️ Painel Admin — Clientes</h3>
      
      {error && (
        <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: '6px', background: 'rgba(233, 69, 96, 0.15)', border: '1px solid #e94560', color: '#ff8a8a', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#a8a8b3' }}>A carregar...</p>
      ) : clientes.length === 0 && !error ? (
        <p style={{ color: '#a8a8b3' }}>Nenhum cliente encontrado.</p>
      ) : clientes.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#eee' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e94560' }}>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>Nome</th>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>Login</th>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>XP</th>
              <th style={{ textAlign: 'left', padding: '0.4rem' }}>Nível</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #0f3460' }}>
                <td style={{ padding: '0.4rem' }}>{c.id}</td>
                <td style={{ padding: '0.4rem' }}>{c.nome}</td>
                <td style={{ padding: '0.4rem' }}>{c.login}</td>
                <td style={{ padding: '0.4rem', color: '#f5a623' }}>{c.xp} XP</td>
                <td style={{ padding: '0.4rem', color: '#fff' }}>{c.nivel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  )
}

export default AdminValidationPanel
