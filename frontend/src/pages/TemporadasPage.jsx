import React, { useState, useEffect } from 'react'
import { fetchTemporadas, criarTemporada, atualizarTemporada } from '../services/api'

export default function TemporadasPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"cargo":"Cliente"}')
  const isAdmin = user.cargo === 'Adm'

  const [temporadas, setTemporadas] = useState([])
  const [nome, setNome] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [ativa, setAtiva] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [editingId, setEditingId] = useState(null)


  const loadTemporadas = () => {
    setLoading(true)
    fetchTemporadas()
      .then(res => {
        setTemporadas(res.data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setErro('Erro ao carregar temporadas do servidor.')
        setLoading(false)
      })
  }

  useEffect(() => {
    loadTemporadas()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setLoading(true)

    if (editingId) {
      atualizarTemporada(editingId, nome, dataInicio, dataFim, ativa)
        .then(() => {
          setSucesso('Temporada atualizada com sucesso!')
          setNome('')
          setDataInicio('')
          setDataFim('')
          setAtiva(false)
          setEditingId(null)
          loadTemporadas()
        })
        .catch(err => {
          setErro(err.response?.data?.error || 'Erro ao atualizar temporada.')
          setLoading(false)
        })
    } else {
      criarTemporada(nome, dataInicio, dataFim, ativa)
        .then(() => {
          setSucesso('Temporada criada com sucesso!')
          setNome('')
          setDataInicio('')
          setDataFim('')
          setAtiva(false)
          loadTemporadas()
        })
        .catch(err => {
          setErro(err.response?.data?.error || 'Erro ao criar temporada.')
          setLoading(false)
        })
    }
  }

  const handleEdit = (t) => {
    setEditingId(t.id)
    setNome(t.nome)
    setDataInicio(t.dataInicio.split('T')[0])
    setDataFim(t.dataFim.split('T')[0])
    setAtiva(t.ativa)
  }

  const handleToggleAtiva = (t) => {
    setErro('')
    setSucesso('')
    atualizarTemporada(t.id, t.nome, t.dataInicio, t.dataFim, !t.ativa)
      .then(() => {
        setSucesso(`Temporada ${!t.ativa ? 'ativada' : 'desativada'} com sucesso!`)
        loadTemporadas()
      })
      .catch(err => {
        setErro(err.response?.data?.error || 'Erro ao alterar status da temporada.')
      })
  }

  const temTemporadaAtiva = temporadas.some(t => t.ativa)

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h2>⚔️ Temporadas RPG</h2>
        <p>{isAdmin ? 'Painel Administrativo para gerenciamento dos ciclos de fidelidade gamificados' : 'Acompanhe as temporadas de fidelidade e prêmios sazonais da RuivoBarber'}</p>
      </div>

      {/* Alerta de temporada não ativa */}
      {isAdmin && !temTemporadaAtiva && !loading && (
        <div className="banner error" style={{ padding: '1rem', marginBottom: '1.5rem', borderLeft: '4px solid #ff4a4a', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <strong style={{ fontSize: '1rem', color: '#ff4a4a' }}>⚠️ Atenção Administrador: Nenhuma Temporada Ativa</strong>
          <span style={{ fontSize: '0.88rem' }}>
            Não há temporadas de RPG ativas no momento. Crie ou ative uma temporada abaixo para habilitar o progresso sazonal dos clientes!
          </span>
        </div>
      )}

      {erro && <div className="banner error" style={{ padding: '0.8rem', marginBottom: '1rem' }}>{erro}</div>}
      {sucesso && <div className="banner success" style={{ padding: '0.8rem', marginBottom: '1rem', color: '#4caf50' }}>{sucesso}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Formulário */}
        {isAdmin && (
          <div className="card">
            <div className="card-header">
              <h3>{editingId ? '✏️ Editar Temporada' : '🆕 Nova Temporada'}</h3>
            </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Nome da Temporada</label>
              <input 
                type="text" 
                className="form-input" 
                value={nome}
                onChange={e => setNome(e.target.value)} 
                placeholder="Ex: Season 1 - Ascensão da Navalha" 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Data de Início</label>
              <input 
                type="date" 
                className="form-input" 
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Data de Término</label>
              <input 
                type="date" 
                className="form-input" 
                value={dataFim}
                onChange={e => setDataFim(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                id="ativa"
                checked={ativa}
                onChange={e => setAtiva(e.target.checked)} 
              />
              <label htmlFor="ativa" style={{ fontSize: '0.9rem', color: '#fff', cursor: 'pointer' }}>Ativar imediatamente (isso desativará outras temporadas)</label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.8rem' }} disabled={loading}>
                {editingId ? '💾 Salvar Alterações' : '✨ Iniciar Temporada'}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  style={{ padding: '0.8rem' }} 
                  onClick={() => {
                    setEditingId(null)
                    setNome('')
                    setDataInicio('')
                    setDataFim('')
                    setAtiva(false)
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
        )}


        {/* Listagem */}
        <div className="card">
          <div className="card-header">
            <h3>⏳ Histórico de Temporadas ({temporadas.length})</h3>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando temporadas...</div>
          ) : temporadas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma temporada cadastrada.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {temporadas.map((t, idx) => {
                const totalDias = Math.ceil((new Date(t.dataFim) - new Date(t.dataInicio)) / (1000 * 60 * 60 * 24))
                return (
                  <div key={t.id} style={{ 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    background: t.ativa ? 'rgba(57, 255, 20, 0.05)' : 'rgba(255,255,255,0.02)',
                    border: t.ativa ? '1px solid #39FF14' : '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: t.ativa ? '#39FF14' : '#fff' }}>{t.nome}</strong>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '20px', 
                        background: t.ativa ? '#39FF14' : 'rgba(255,255,255,0.1)', 
                        color: t.ativa ? '#000' : 'var(--text-muted)',
                        fontWeight: 'bold'
                      }}>
                        {t.ativa ? 'ATIVA' : 'INATIVA'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      📅 <strong>Início:</strong> {new Date(t.dataInicio).toLocaleDateString('pt-BR')} | <strong>Fim:</strong> {new Date(t.dataFim).toLocaleDateString('pt-BR')} ({totalDias} dias)
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                        <button 
                          type="button" 
                          onClick={() => handleEdit(t)} 
                          className="btn btn-ghost" 
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                        >
                          Editar ✏️
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleToggleAtiva(t)} 
                          className="btn btn-ghost" 
                          style={{ 
                            fontSize: '0.8rem', 
                            padding: '0.3rem 0.6rem',
                            color: t.ativa ? '#ff4a4a' : '#39FF14'
                          }}
                        >
                          {t.ativa ? 'Desativar ⏹️' : 'Ativar ⚡'}
                        </button>
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
