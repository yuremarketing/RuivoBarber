import React, { useEffect, useState } from 'react'
import { listarClientes } from '../services/api.js'
import PlayerCard from '../components/PlayerCard.jsx'
import RpgProgressBar from '../components/RpgProgressBar.jsx'
import RedeemCouponManager from '../components/RedeemCouponManager.jsx'

const mockClientes = [
  { id: 1, nome: 'João Silva', login: 'joao.silva', cargo: 'Cliente', xp: 320, nivel: 'Barba de Respeito' },
  { id: 2, nome: 'Pedro Santos', login: 'pedro.s', cargo: 'Cliente', xp: 580, nivel: 'Lenda da Navalha' },
  { id: 3, nome: 'André Costa', login: 'andre.c', cargo: 'Cliente', xp: 75, nivel: 'Corte Iniciante' },
  { id: 4, nome: 'Marcos Oliveira', login: 'marcos.o', cargo: 'Cliente', xp: 950, nivel: 'Rei da Cadeira' },
  { id: 5, nome: 'Lucas Ferreira', login: 'lucas.f', cargo: 'Cliente', xp: 210, nivel: 'Barba de Respeito' },
]

export default function ClientesPage() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState(null)
  const [error, setError] = useState(null)

  const fetchClientes = async () => {
    try {
      setLoading(true)
      const res = await listarClientes()
      if (res && Array.isArray(res.data)) {
        setClientes(res.data)
      } else {
        throw new Error('Formato de dados inválido recebido do servidor.')
      }
    } catch (err) {
      console.error('Erro ao buscar clientes da API, usando dados mockados:', err)
      setError('Não foi possível carregar os dados em tempo real. Exibindo dados locais offline.')
      setClientes(mockClientes)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  const filtered = (clientes || []).filter(c => 
    c && c.nome && typeof c.nome === 'string' && c.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>👥 Clientes</h2>
            <p>Gestão de clientes e progresso RPG</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Novo Cliente</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', marginBottom: '1.5rem', borderRadius: '6px', background: 'rgba(233, 69, 96, 0.15)', border: '1px solid #e94560', color: '#ff8a8a', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>⏳ A carregar...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>Nenhum cliente encontrado.</p></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Nome</th><th>Login</th><th>Nível</th><th>XP</th><th>Progresso</th><th>Ações</th></tr></thead>
              <tbody>
                {filtered.map(c => {
                  if (!c) return null
                  const niveis = { 'Corte Iniciante': 300, 'Barba de Respeito': 600, 'Lenda da Navalha': 1000, 'Rei da Cadeira': 1000 }
                  const nivelNome = c.nivel || 'Corte Iniciante'
                  const max = niveis[nivelNome] || 300
                  const pct = Math.min((c.xp || 0) / max * 100, 100)
                  return (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-muted)' }}>#{c.id}</td>
                      <td style={{ fontWeight: 600 }}>{c.nome || 'Sem Nome'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.login || 'sem-login'}</td>
                      <td><span className="rpg-level-badge" style={{ fontSize: '0.6rem' }}>{nivelNome}</span></td>
                      <td style={{ color: 'var(--gold)', fontWeight: 600 }}>{c.xp || 0} XP</td>
                      <td style={{ minWidth: '120px' }}>
                        <div className="xp-bar"><div className="xp-bar-fill" style={{ width: `${pct}%` }} /></div>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" title="Ver detalhes" onClick={() => setSelectedCliente(c)}>👁️</button>
                        <button className="btn btn-ghost btn-sm" title="Editar">✏️</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 Novo Cliente</h3>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input type="text" className="form-input" placeholder="Nome do cliente" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Login</label>
                <input type="text" className="form-input" placeholder="Login de acesso" />
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <input type="password" className="form-input" placeholder="Senha inicial" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>Salvar Cliente</button>
            </div>
          </div>
        </div>
      )}

      {selectedCliente && (
        <div className="modal-overlay" onClick={() => setSelectedCliente(null)}>
          <div className="modal" style={{ maxWidth: '640px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚔️ Ficha do Personagem RPG</h3>
              <button className="btn-ghost" onClick={() => setSelectedCliente(null)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'start' }}>
              <div style={{ flex: '1', minWidth: '240px', display: 'flex', justifyContent: 'center' }}>
                <PlayerCard 
                  nome={selectedCliente.nome} 
                  nivel={selectedCliente.nivel} 
                  xp={selectedCliente.xp} 
                />
              </div>
              
              <div style={{ flex: '1.2', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <RpgProgressBar 
                  xpAtual={selectedCliente.xp} 
                  nivel={selectedCliente.nivel} 
                />
                <RedeemCouponManager 
                  clienteId={selectedCliente.id} 
                  xpAtual={selectedCliente.xp}
                  onRedeemSuccess={() => {
                    // Atualiza a lista de clientes para obter qualquer novo cupom ou sincronizar estado
                    fetchClientes()
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
