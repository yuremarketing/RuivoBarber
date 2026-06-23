import React, { useState, useEffect } from 'react'
import { fetchServicos, criarServico, atualizarServico, deletarServico } from '../services/api.js'

const getServiceDetails = (nome) => {
  const n = nome.toLowerCase()
  if (n.includes('corte') && n.includes('barba')) {
    return { icon: '💈', desc: 'Combo completo: corte estilizado + barba na navalha' }
  } else if (n.includes('corte')) {
    return { icon: '✂️', desc: 'Corte masculino clássico com máquina e tesoura' }
  } else if (n.includes('barba')) {
    return { icon: '🧔', desc: 'Barba com toalha quente, navalha e hidratação' }
  } else if (n.includes('hidra')) {
    return { icon: '💧', desc: 'Tratamento profundo para cabelos danificados' }
  }
  return { icon: '✨', desc: 'Serviço personalizado de alta qualidade' }
}

export default function ServicosPage() {
  const [servicos, setServicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingServico, setEditingServico] = useState(null)

  // Form states
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [duracao, setDuracao] = useState(30)
  const [xp, setXp] = useState(10)

  const userSessionStr = localStorage.getItem('ruivobarber_user')
  const session = userSessionStr ? JSON.parse(userSessionStr) : null
  const user = session?.user || session
  const isAdmin = user?.cargo === 'Adm'

  const loadServicos = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchServicos()
      setServicos(res.data || [])
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar serviços do servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServicos()
  }, [])

  const handleOpenCreate = () => {
    setEditingServico(null)
    setNome('')
    setPreco('')
    setDuracao(30)
    setXp(10)
    setShowModal(true)
  }

  const handleOpenEdit = (s) => {
    setEditingServico(s)
    setNome(s.nome)
    setPreco(s.preco)
    setDuracao(s.duracaoMinutos || 30)
    setXp(s.xpRecompensa || 10)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nome || !preco) {
      alert('Nome e preço são obrigatórios.')
      return
    }

    const payload = {
      nome,
      preco: parseFloat(preco),
      duracaoMinutos: parseInt(duracao),
      xpRecompensa: parseInt(xp)
    }

    try {
      if (editingServico) {
        await atualizarServico(editingServico.id, payload)
      } else {
        await criarServico(payload)
      }
      setShowModal(false)
      loadServicos()
    } catch (err) {
      alert('Erro ao salvar serviço: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await deletarServico(id)
        loadServicos()
      } catch (err) {
        alert('Erro ao excluir serviço: ' + (err.response?.data?.error || err.message))
      }
    }
  }

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div className="page-header-actions">
          <div>
            <h2>✂️ Serviços</h2>
            <p>Catálogo de serviços e preços</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={handleOpenCreate}>+ Novo Serviço</button>
          )}
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      {loading ? (
        <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando serviços...</p>
      ) : servicos.length === 0 ? (
        <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum serviço cadastrado.</p>
      ) : (
        <div className="services-grid">
          {servicos.map(s => {
            const details = getServiceDetails(s.nome)
            return (
              <div key={s.id} className="service-card">
                <div className="service-icon">{details.icon}</div>
                <div className="service-name">{s.nome}</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4, height: '40px', overflow: 'hidden' }}>
                  {details.desc}
                </p>
                <div className="service-price">R$ {s.preco ? s.preco.toFixed(2) : '0.00'}</div>
                <div className="service-meta">
                  <div className="service-meta-item">⏱️ <strong>{s.duracaoMinutos || 30}</strong> min</div>
                  <div className="service-meta-item">⚔️ <strong style={{ color: 'var(--gold)' }}>+{s.xpRecompensa || 10} XP</strong></div>
                </div>
                {isAdmin && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => handleOpenEdit(s)}>✏️ Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑️</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✂️ {editingServico ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome do Serviço</label>
                <input type="text" className="form-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Corte Degradê" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Preço (R$)</label>
                  <input type="number" className="form-input" value={preco} onChange={e => setPreco(e.target.value)} placeholder="0.00" step="0.01" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Duração (min)</label>
                  <input type="number" className="form-input" value={duracao} onChange={e => setDuracao(e.target.value)} placeholder="30" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">XP Recompensa</label>
                <input type="number" className="form-input" value={xp} onChange={e => setXp(e.target.value)} placeholder="10" required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Serviço</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
