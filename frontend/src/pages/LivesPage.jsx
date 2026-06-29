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
          <div className="card" style={{ padding: '1.5rem', marginTop: '1rem', background: 'rgba(20, 20, 25, 0.95)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span className="badge" style={{ backgroundColor: 'var(--red)', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.25rem 0.6rem', animation: 'pulse 2s infinite' }}>
                  🔴 AO VIVO
                </span>
                <h3 style={{ marginTop: '0.4rem', color: '#fff', fontSize: '1.4rem' }}>{liveAtiva.titulo}</h3>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Via <strong style={{ color: 'var(--gold)' }}>{liveAtiva.plataforma}</strong>
              </div>
            </div>

            <div style={{
              position: 'relative',
              paddingBottom: '56.25%', // 16:9 Aspect Ratio
              height: 0,
              overflow: 'hidden',
              borderRadius: '8px',
              border: '2px solid var(--gold)',
              boxShadow: '0 0 25px rgba(212, 175, 55, 0.15)',
              backgroundColor: '#000'
            }}>
              <iframe
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%'
                }}
                src={getEmbedUrl(liveAtiva.url, liveAtiva.plataforma)}
                title={liveAtiva.titulo}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              🎥 Problemas com o player? <a href={liveAtiva.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>Clique aqui para abrir na plataforma original</a>.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', marginTop: '1.5rem', border: '1px dashed var(--border)', background: 'rgba(255, 255, 255, 0.02)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔮</div>
            <h3 style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>O Espelho Mágico está Desativado</h3>
            <p style={{ maxWidth: '500px', margin: '0 auto', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
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
        <div style={{ padding: '0.75rem', borderRadius: '4px', backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4CAF50', color: '#4CAF50', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {success}
        </div>
      )}
      
      {error && (
        <div style={{ padding: '0.75rem', borderRadius: '4px', backgroundColor: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', color: '#f44336', marginBottom: '1rem', fontSize: '0.9rem' }}>
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
            <form onSubmit={handleCriar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input 
                      type="checkbox" 
                      checked={definirAtiva}
                      onChange={e => setDefinirAtiva(e.target.checked)}
                    />
                    Ativar imediatamente
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }} disabled={loading}>
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
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem' }}>
                Nenhuma transmissão cadastrada ainda.
              </p>
            ) : (
              <div className="flex-column gap-0-75">
                {lives.map(live => (
                  <div 
                    key={live.id} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: live.ativa ? '1px solid var(--gold)' : '1px solid var(--border)',
                      boxShadow: live.ativa ? '0 0 10px rgba(212, 175, 55, 0.1)' : 'none'
                    }}
                  >
                    <div style={{ overflow: 'hidden', marginRight: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.92rem', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {live.titulo}
                        </span>
                        {live.ativa && (
                          <span className="badge" style={{ backgroundColor: 'var(--red)', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                            ATIVA
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>Plataforma: <strong>{live.plataforma}</strong></span>
                        <span>•</span>
                        <a href={live.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>Link original</a>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      {!live.ativa && (
                        <button 
                          className="btn btn-ghost" 
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderColor: 'var(--gold)', color: 'var(--gold)' }}
                          onClick={() => handleAtivar(live.id)}
                          disabled={loading}
                        >
                          Ativar
                        </button>
                      )}
                      <button 
                        className="btn btn-ghost" 
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', color: 'var(--red)' }}
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
        <div style={{ position: 'sticky', top: '1.5rem' }}>
          <div className="card">
            <div className="card-header mb-1">
              <h3>Monitor da Live Ativa</h3>
            </div>
            
            {liveAtiva ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--gold)' }}>{liveAtiva.titulo}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{liveAtiva.plataforma}</span>
                </div>
                
                <div style={{
                  position: 'relative',
                  paddingBottom: '56.25%',
                  height: 0,
                  overflow: 'hidden',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#000'
                }}>
                  <iframe
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%'
                    }}
                    src={getEmbedUrl(liveAtiva.url, liveAtiva.plataforma)}
                    title="Preview Live Ativa"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', border: '1px dashed var(--border)', borderRadius: '6px' }}>
                Nenhuma live ativa no momento. Use o painel ao lado para cadastrar ou ativar uma transmissão.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
