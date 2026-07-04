import React, { useState, useEffect } from 'react'
import { fetchLives, fetchLiveAtiva, criarLive, ativarLive, excluirLive } from '../services/api.js'

export default function LivesPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Administrador","cargo":"Adm"}')
  const isAdmin = user.cargo === 'Adm' || user.cargo === 'Barbeiro'

  const [lives, setLives] = useState([])
  const [liveAtiva, setLiveAtiva] = useState(null)
  
  // Form states
  const [titulo, setTitulo] = useState('')
  const [url, setUrl] = useState('')
  const [plataforma, setPlataforma] = useState('YouTube')
  const [definirAtiva, setDefinirAtiva] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const getEmbedUrl = (link, plat) => {
    if (!link) return ''
    
    // YouTube parsing
    if (plat === 'YouTube' || link.includes('youtube.com') || link.includes('youtu.be')) {
      let videoId = ''
      if (link.includes('v=')) {
        videoId = link.split('v=')[1]?.split('&')[0]
      } else if (link.includes('youtu.be/')) {
        videoId = link.split('youtu.be/')[1]?.split('?')[0]
      } else if (link.includes('embed/')) {
        videoId = link.split('embed/')[1]?.split('?')[0]
      } else if (link.includes('/live/')) {
        videoId = link.split('/live/')[1]?.split('?')[0]
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : link
    }
    
    // Twitch parsing
    if (plat === 'Twitch' || link.includes('twitch.tv')) {
      let channel = ''
      if (link.includes('twitch.tv/')) {
        channel = link.split('twitch.tv/')[1]?.split('?')[0]
      }
      const currentHost = window.location.hostname
      return channel ? `https://player.twitch.tv/?channel=${channel}&parent=${currentHost}&autoplay=false` : link
    }
    
    // Facebook parsing
    if (plat === 'Facebook' || link.includes('facebook.com')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(link)}&show_text=0&t=0`
    }
    
    return link
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const resAtiva = await fetchLiveAtiva()
      if (resAtiva && resAtiva.data && resAtiva.data.id) {
        setLiveAtiva(resAtiva.data)
      } else {
        setLiveAtiva(null)
      }

      if (isAdmin) {
        const resList = await fetchLives()
        if (resList && resList.data) {
          setLives(resList.data)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados de transmissões:', err)
      // fetchLiveAtiva can return 404 when there is no active live, which is normal
      if (err.response?.status !== 404) {
        setError('Não foi possível carregar as informações das transmissões.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCriar = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!titulo || !url) {
      setError('Preencha o título e a URL da live.')
      return
    }

    try {
      setLoading(true)
      const res = await criarLive(titulo, url, plataforma, definirAtiva)
      setSuccess('Transmissão cadastrada com sucesso!')
      setTitulo('')
      setUrl('')
      setPlataforma('YouTube')
      
      // If we marked as active, reload all data
      loadData()
    } catch (err) {
      console.error('Erro ao cadastrar live:', err)
      setError(err.response?.data?.error || 'Erro ao cadastrar transmissão.')
    } finally {
      setLoading(false)
    }
  }

  const handleAtivar = async (id) => {
    setError('')
    setSuccess('')
    try {
      setLoading(true)
      await ativarLive(id)
      setSuccess('Transmissão ativada com sucesso!')
      loadData()
    } catch (err) {
      console.error('Erro ao ativar live:', err)
      setError(err.response?.data?.error || 'Erro ao ativar transmissão.')
    } finally {
      setLoading(false)
    }
  }

  const handleExcluir = async (id) => {
    if (!confirm('Deseja realmente excluir esta transmissão?')) return
    setError('')
    setSuccess('')
    try {
      setLoading(true)
      await excluirLive(id)
      setSuccess('Transmissão excluída!')
      loadData()
    } catch (err) {
      console.error('Erro ao excluir live:', err)
      setError(err.response?.data?.error || 'Erro ao excluir transmissão.')
    } finally {
      setLoading(false)
    }
  }

  // CLIENT VIEW
  if (!isAdmin) {
    return (
      <div className="fade-in-up">
        <div className="page-header">
          <h2>Assista ao Vivo</h2>
          <p>Acompanhe transmissões ao vivo da RuivoBarber directly from the Guild Hall</p>
        </div>

        {liveAtiva ? (
          <div className="card lives-client-card">
            <div className="lives-client-header">
              <div>
                <span className="badge lives-badge-live">
                  🔴 AO VIVO
                </span>
                <h3 className="lives-title-active">{liveAtiva.titulo}</h3>
              </div>
              <div className="lives-meta-plat">
                Via <strong className="lives-plat-highlight">{liveAtiva.plataforma}</strong>
              </div>
            </div>

            <div className="lives-iframe-wrapper">
              <iframe
                className="lives-iframe"
                src={getEmbedUrl(liveAtiva.url, liveAtiva.plataforma)}
                title={liveAtiva.titulo}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            
            <p className="lives-fallback-msg">
              🎥 Problemas com o player? <a href={liveAtiva.url} target="_blank" rel="noopener noreferrer" className="lives-fallback-link">Clique aqui para abrir na plataforma original</a>.
            </p>
          </div>
        ) : (
          <div className="card lives-empty-state">
            <div className="lives-empty-icon">🔮</div>
            <h3 className="lives-empty-title">O Espelho Mágico está Desativado</h3>
            <p className="lives-empty-desc">
              A taverna está em silêncio. Nenhuma transmissão ao vivo ativa no momento. 
              Fique atento ao nosso canal para assistir campeonatos de RPG, gameplays de barbeiros e eventos da guilda!
            </p>
          </div>
        )}
      </div>
    )
  }

  // ADMIN VIEW
  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h2>Lives & Transmissões</h2>
        <p>Gerencie as transmissões ao vivo exibidas no portal do cliente</p>
      </div>

      {success && (
        <div className="lives-alert-success">
          {success}
        </div>
      )}
      
      {error && (
        <div className="lives-alert-error">
          {error}
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Side: Creation and List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Cadastro Form */}
          <div className="card">
            <div className="card-header mb-1">
              <h3>➕ Cadastrar Nova Transmissão</h3>
            </div>
            <form onSubmit={handleCriar} className="lives-admin-form">
              <div className="form-group">
                <label className="form-label">Título da Live</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Campeonato Guilda RuivoBarber 2026" 
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">URL da Live</label>
                <input 
                  type="url" 
                  className="form-input" 
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="Ex: https://www.youtube.com/watch?v=..." 
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Plataforma</label>
                  <select 
                    className="form-input"
                    value={plataforma}
                    onChange={e => setPlataforma(e.target.value)}
                  >
                    <option value="YouTube">YouTube</option>
                    <option value="Twitch">Twitch</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', height: '100%', marginTop: '1.75rem' }}>
                  <label className="lives-form-checkbox">
                    <input 
                      type="checkbox" 
                      checked={definirAtiva}
                      onChange={e => setDefinirAtiva(e.target.checked)}
                    />
                    Ativar imediatamente
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-primary lives-btn-submit" disabled={loading}>
                💾 Cadastrar Live
              </button>
            </form>
          </div>

          {/* List of Lives */}
          <div className="card">
            <div className="card-header mb-1">
              <h3>📜 Histórico de Lives</h3>
            </div>
            
            {lives.length === 0 ? (
              <p className="lives-history-empty">
                Nenhuma transmissão cadastrada ainda.
              </p>
            ) : (
              <div className="flex-column gap-0-75">
                {lives.map(live => (
                  <div 
                    key={live.id} 
                    className={`lives-list-item ${live.ativa ? 'lives-list-item--active' : 'lives-list-item--inactive'}`}
                  >
                    <div className="lives-item-left">
                      <div className="lives-item-title-row">
                        <span className="lives-item-title">
                          {live.titulo}
                        </span>
                        {live.ativa && (
                          <span className="badge lives-badge-small">
                            ATIVA
                          </span>
                        )}
                      </div>
                      <div className="lives-item-meta">
                        <span>Plataforma: <strong>{live.plataforma}</strong></span>
                        <span>•</span>
                        <a href={live.url} target="_blank" rel="noopener noreferrer" className="lives-fallback-link">Link original</a>
                      </div>
                    </div>

                    <div className="lives-item-actions">
                      {!live.ativa && (
                        <button 
                          className="btn btn-ghost lives-btn-activate" 
                          onClick={() => handleAtivar(live.id)}
                          disabled={loading}
                        >
                          Ativar
                        </button>
                      )}
                      <button 
                        className="btn btn-ghost lives-btn-delete" 
                        onClick={() => handleExcluir(live.id)}
                        disabled={loading}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Live Preview */}
        <div className="lives-monitor-wrapper">
          <div className="card">
            <div className="card-header mb-1">
              <h3>Monitor da Live Ativa</h3>
            </div>
            
            {liveAtiva ? (
              <div>
                <div className="lives-monitor-header">
                  <span className="lives-monitor-title">{liveAtiva.titulo}</span>
                  <span className="lives-monitor-plat">{liveAtiva.plataforma}</span>
                </div>
                
                <div className="lives-monitor-iframe-wrapper">
                  <iframe
                    className="lives-iframe"
                    src={getEmbedUrl(liveAtiva.url, liveAtiva.plataforma)}
                    title="Preview Live Ativa"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div className="lives-monitor-empty">
                Nenhuma live ativa no momento. Use o painel ao lado para cadastrar ou ativar uma transmissão.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
