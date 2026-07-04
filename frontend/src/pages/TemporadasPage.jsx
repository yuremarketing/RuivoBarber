import React, { useState, useEffect } from 'react'
import { fetchTemporadas, criarTemporada, atualizarTemporada } from '../services/api'
import ErrorState from '../components/ErrorState.jsx'

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
        <h2>Temporadas RPG</h2>
        <p>{isAdmin ? 'Painel Administrativo para gerenciamento dos ciclos de fidelidade gamificados' : 'Acompanhe as temporadas de fidelidade e prêmios sazonais da RuivoBarber'}</p>
      </div>

      {/* Alerta de temporada não ativa */}
      {isAdmin && !temTemporadaAtiva && !loading && (
        <div className="banner error temporadas-page-alert">
          <strong className="temporadas-page-alert-title">⚠️ Atenção Administrador: Nenhuma Temporada Ativa</strong>
          <span className="temporadas-page-alert-desc">
            Não há temporadas de RPG ativas no momento. Crie ou ative uma temporada abaixo para habilitar o progresso sazonal dos clientes!
          </span>
        </div>
      )}

      {erro && <div className="banner error temporadas-page-banner-error">{erro}</div>}
      {sucesso && <div className="banner success temporadas-page-banner-success">{sucesso}</div>}

      <div className={`temporadas-page-grid ${isAdmin ? 'temporadas-page-grid--admin' : 'temporadas-page-grid--client'}`}>
        
        {/* Formulário */}
        {isAdmin && (
          <div className="card">
            <div className="card-header">
              <h3>{editingId ? '✏️ Editar Temporada' : '🆕 Nova Temporada'}</h3>
            </div>

          <form onSubmit={handleSubmit} className="temporadas-page-form">
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

            <div className="form-group temporadas-page-checkbox-group">
              <input 
                type="checkbox" 
                id="ativa"
                checked={ativa}
                onChange={e => setAtiva(e.target.checked)} 
              />
              <label htmlFor="ativa" className="temporadas-page-checkbox-label">Ativar imediatamente (isso desativará outras temporadas)</label>
            </div>

            <div className="temporadas-page-actions">
              <button type="submit" className="btn btn-primary temporadas-page-btn-submit" disabled={loading}>
                {editingId ? '💾 Salvar Alterações' : 'Iniciar Temporada'}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  className="btn btn-ghost temporadas-page-btn-cancel" 
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
            <h3>Histórico de Temporadas ({temporadas.length})</h3>
          </div>
          {erro && temporadas.length === 0 ? (
            <div style={{ padding: '2rem' }}>
              <ErrorState message={erro} onRetry={loadTemporadas} />
            </div>
          ) : loading ? (
            <div className="temporadas-page-skel-wrapper">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-pulse temporadas-page-skel"></div>
              ))}
            </div>
          ) : temporadas.length === 0 ? (
            <div className="temporadas-page-empty">Nenhuma temporada cadastrada.</div>
          ) : (
            <div className="temporadas-page-list">
              {temporadas.map((t, idx) => {
                const totalDias = Math.ceil((new Date(t.dataFim) - new Date(t.dataInicio)) / (1000 * 60 * 60 * 24))
                const activeClass = t.ativa ? 'temporadas-page-item--active' : 'temporadas-page-item--inactive'
                const titleClass = t.ativa ? 'temporadas-page-item-title--active' : 'temporadas-page-item-title--inactive'
                const badgeClass = t.ativa ? 'temporadas-page-item-badge--active' : 'temporadas-page-item-badge--inactive'
                const toggleClass = t.ativa ? 'temporadas-page-item-btn-toggle--active' : 'temporadas-page-item-btn-toggle--inactive'
                return (
                  <div key={t.id} className={`temporadas-page-item ${activeClass}`}>
                    <div className="temporadas-page-item-header">
                      <strong className={titleClass}>{t.nome}</strong>
                      <span className={`temporadas-page-item-badge ${badgeClass}`}>
                        {t.ativa ? 'ATIVA' : 'INATIVA'}
                      </span>
                    </div>

                    <div className="temporadas-page-item-dates">
                      <strong>Início:</strong> {new Date(t.dataInicio).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} | <strong>Fim:</strong> {new Date(t.dataFim).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ({totalDias} dias)
                    </div>

                    {isAdmin && (
                      <div className="temporadas-page-item-actions">
                        <button 
                          type="button" 
                          onClick={() => handleEdit(t)} 
                          className="btn btn-ghost temporadas-page-item-btn" 
                        >
                          Editar ✏️
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleToggleAtiva(t)} 
                          className={`btn btn-ghost temporadas-page-item-btn ${toggleClass}`}
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
