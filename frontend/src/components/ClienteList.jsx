import React, { useEffect, useState } from 'react'
import { listarClientes } from '../services/api.js'

export default function ClienteList() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log('ClienteList: Iniciando busca de dados')
    const fetchClientes = async () => {
      try {
        setLoading(true)
        const response = await listarClientes()
        console.log('ClienteList: Dados recebidos:', response.data)
        if (response && Array.isArray(response.data)) {
          setClientes(response.data)
        } else {
          throw new Error('Formato de dados inválido recebido do servidor.')
        }
      } catch (err) {
        console.error('ClienteList: Erro na busca:', err)
        setError('Não foi possível carregar os clientes.')
        const customError = new Error(`Erro customizado: ${err.message || err}`)
        customError.stack = err.stack
        throw customError
      } finally {
        setLoading(false)
      }
    }

    fetchClientes()
  }, [])

  if (loading) return <div className="empty-state"><p>A carregar...</p></div>
  if (error) return <div style={{ color: 'var(--red)' }}>⚠️ {error}</div>

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Login</th>
            <th>Nível</th>
            <th>XP</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map(c => {
            if (!c) return null
            return (
              <tr key={c.id}>
                <td>#{c.id}</td>
                <td>{c.nome || 'Sem Nome'}</td>
                <td>{c.login || 'sem-login'}</td>
                <td>{c.nivel || 'Corte Iniciante'}</td>
                <td>{c.xp || 0} XP</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
