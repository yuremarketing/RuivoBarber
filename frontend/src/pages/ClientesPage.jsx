import React, { useEffect, useState } from 'react'
import { listarClientes, cadastrarCliente, atualizarPerfil, deletarCliente } from '../services/api.js'
import PlayerCard from '../components/PlayerCard.jsx'
import RpgProgressBar from '../components/RpgProgressBar.jsx'
import RedeemCouponManager from '../components/RedeemCouponManager.jsx'

export default function ClientesPage() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState(null)
  const [error, setError] = useState(null)

  // Estados para o cadastro/edição de cliente
  const [nomeNovo, setNomeNovo] = useState('')
  const [loginNovo, setLoginNovo] = useState('')
  const [senhaNovo, setSenhaNovo] = useState('')
  const [cargoNovo, setCargoNovo] = useState('Cliente')
  const [editingCliente, setEditingCliente] = useState(null)
  const [modalError, setModalError] = useState(null)
  const [modalSaving, setModalSaving] = useState(false)

  const handleOpenModal = () => {
    setEditingCliente(null)
    setNomeNovo('')
    setLoginNovo('')
    setSenhaNovo('')
    setCargoNovo('Cliente')
    setModalError(null)
    setShowModal(true)
  }

  const handleOpenEditModal = (c) => {
    setEditingCliente(c)
    setNomeNovo(c.nome || '')
    setLoginNovo(c.login || '')
    setSenhaNovo('')
    setCargoNovo(c.cargo || 'Cliente')
    setModalError(null)
    setShowModal(true)
  }

  const handleDeletarCliente = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return
    }
    try {
      await deletarCliente(id)
      fetchClientes()
    } catch (err) {
      console.error('Erro ao excluir usuário:', err)
      alert(err.response?.data?.error || 'Erro ao excluir usuário.')
    }
  }

  const handleSalvarCliente = async () => {
    if (!nomeNovo || !loginNovo) {
      setModalError('Nome e Login são obrigatórios.')
      return
    }
    if (!editingCliente && !senhaNovo) {
      setModalError('A senha é obrigatória para novos usuários.')
      return
    }
    try {
      setModalSaving(true)
      setModalError(null)
      
      if (editingCliente) {
        // Modo Edição
        await atualizarPerfil(editingCliente.id, {
          nome: nomeNovo,
          login: loginNovo,
          senha: senhaNovo || undefined,
          cargo: cargoNovo
        })
      } else {
        // Modo Cadastro
        await cadastrarCliente(nomeNovo, loginNovo, senhaNovo, cargoNovo)
      }
      
      setShowModal(false)
      fetchClientes()
    } catch (err) {
      console.error('Erro ao salvar cliente:', err)
      const msg = err.response?.data?.error || 'Erro ao salvar cliente. Verifique os dados e tente novamente.'
      setModalError(msg)
    } finally {
      setModalSaving(false)
    }
  }

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
      console.error('Erro ao buscar clientes da API:', err)
      setError('Não foi possível carregar a lista de clientes.')
      setClientes([])
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
            <h2>Usuários</h2>
            <p>Gestão de contas e permissões do sistema</p>
          </div>
          <button className="btn btn-primary" onClick={handleOpenModal}>+ Novo Usuário</button>
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
          <input type="text" placeholder="Buscar usuário..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
      </div>
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>A carregar...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>Nenhum usuário encontrado.</p></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Nome</th><th>Login</th><th>Cargo / Nível</th><th>XP</th><th>Progresso</th><th>Ações</th></tr></thead>
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
                      <td className="font-semibold">{c.nome || 'Sem Nome'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.login || 'sem-login'}</td>
                      <td>
                        {c.cargo === 'Adm' ? (
                          <span className="badge badge-adm" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>Adm</span>
                        ) : c.cargo === 'Barbeiro' ? (
                          <span className="badge badge-barbeiro" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>Barbeiro</span>
                        ) : (
                          <span className="rpg-level-badge" style={{ fontSize: '0.65rem' }}>{nivelNome}</span>
                        )}
                      </td>
                      <td style={{ color: c.cargo === 'Cliente' ? 'var(--gold)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {c.cargo === 'Cliente' ? `${c.xp || 0} XP` : '-'}
                      </td>
                      <td style={{ minWidth: '120px' }}>
                        {c.cargo === 'Cliente' ? (
                          <div className="xp-bar"><div className="xp-bar-fill" style={{ width: `${pct}%` }} /></div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>RPG Inativo</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" title="Ver detalhes" onClick={() => setSelectedCliente(c)}>👁️</button>
                        <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => handleOpenEditModal(c)}>✏️</button>
                        <button className="btn btn-ghost btn-sm" title="Excluir" style={{ color: 'var(--red)' }} onClick={() => handleDeletarCliente(c.id)}>🗑️</button>
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
              <h3>{editingCliente ? '👤 Editar Usuário' : '👤 Novo Usuário'}</h3>
              <button className="btn-ghost" onClick={() => setShowModal(false)} disabled={modalSaving}>✕</button>
            </div>
            {modalError && (
              <div style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: '6px', background: 'rgba(233, 69, 96, 0.15)', border: '1px solid #e94560', color: '#ff8a8a', fontSize: '0.85rem' }}>
                ⚠️ {modalError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Nome do usuário" 
                value={nomeNovo} 
                onChange={e => setNomeNovo(e.target.value)} 
                disabled={modalSaving}
              />
            </div>
            
            <div className="form-group mb-1">
              <label className="form-label">Cargo (Nível de Acesso)</label>
              <select 
                className="form-input" 
                value={cargoNovo} 
                onChange={e => setCargoNovo(e.target.value)} 
                disabled={modalSaving}
              >
                <option value="Cliente">Cliente (Acumula XP/RPG)</option>
                <option value="Barbeiro">Barbeiro (Atende e vende)</option>
                <option value="Adm">Administrador (Controle Total)</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Login</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Login de acesso" 
                  value={loginNovo} 
                  onChange={e => setLoginNovo(e.target.value)} 
                  disabled={modalSaving}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{editingCliente ? 'Nova Senha (opcional)' : 'Senha'}</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder={editingCliente ? 'Deixe em branco para não alterar' : 'Senha inicial'} 
                  value={senhaNovo} 
                  onChange={e => setSenhaNovo(e.target.value)} 
                  disabled={modalSaving}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={modalSaving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSalvarCliente} disabled={modalSaving}>
                {modalSaving ? 'A salvar...' : editingCliente ? 'Salvar Alterações' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCliente && (
        <div className="modal-overlay" onClick={() => setSelectedCliente(null)}>
          <div className="modal" style={{ maxWidth: '640px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Ficha do Personagem RPG</h3>
              <button className="btn-ghost" onClick={() => setSelectedCliente(null)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'start' }}>
              <div style={{ flex: '1', minWidth: '240px', display: 'flex', justifyContent: 'center' }}>
                <PlayerCard 
                  nome={selectedCliente.nome} 
                  nivel={selectedCliente.nivel} 
                  xp={selectedCliente.xp} 
                  avatarUrl={selectedCliente.avatarUrl}
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
