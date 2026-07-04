import React, { useState, useEffect } from 'react'
import { 
  fetchClas, 
  fetchMeuCla, 
  fetchClaMembros, 
  criarCla, 
  convidarUsuario, 
  buscarJogadoresSemCla, 
  fetchConvitesRecebidos, 
  aceitarConvite, 
  recusarConvite, 
  fetchClasMural, 
  postarNoMural, 
  fetchClasMissoes 
} from '../services/api.js'
import ErrorState from '../components/ErrorState.jsx'

export default function ClasPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Jogador","cargo":"Cliente"}')
  
  const [activeTab, setActiveTab] = useState('painel') // 'painel' | 'mural' | 'ranking'
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Clan states
  const [meuCla, setMeuCla] = useState(null)
  const [membros, setMembros] = useState([])
  const [ranking, setRanking] = useState([])
  const [missoes, setMissoes] = useState([])
  const [convites, setConvites] = useState([])
  const [mural, setMural] = useState([])

  // Form & Interaction states
  const [nomeCla, setNomeCla] = useState('')
  const [descCla, setDescCla] = useState('')
  const [msgMural, setMsgMural] = useState('')
  
  // Member invite search
  const [buscaJogador, setBuscaJogador] = useState('')
  const [jogadoresSemCla, setJogadoresSemCla] = useState([])

  const loadData = async () => {
    try {
      setInitialLoading(true)
      setLoading(true)
      setError('')
      
      // 1. Fetch user's clan info
      try {
        const resMeuCla = await fetchMeuCla()
        if (resMeuCla && resMeuCla.data) {
          setMeuCla(resMeuCla.data)
          
          // Fetch members
          const resMembros = await fetchClaMembros(resMeuCla.data.id)
          setMembros(resMembros.data || [])
          
          // Fetch weekly missions progress
          const resMissoes = await fetchClasMissoes()
          setMissoes(resMissoes.data || [])

          // Fetch mural
          const resMural = await fetchClasMural()
          setMural(resMural.data || [])
        }
      } catch (err) {
        // 404 means user is not in a clan, which is fine
        setMeuCla(null)
        if (err.response?.status !== 404) {
          setError('Erro ao carregar dados do seu Clã.')
        }
      }

      // 2. Fetch Leaderboard/Ranking
      const resRanking = await fetchClas()
      setRanking(resRanking.data || [])

      // 3. Fetch received invites (only if user has no clan)
      if (!meuCla) {
        const resConvites = await fetchConvitesRecebidos()
        setConvites(resConvites.data || [])
      }

    } catch (err) {
      console.error('Erro ao carregar clãs:', err)
      setError('Falha ao sincronizar dados com a guilda.')
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Action: Create Clan
  const handleCriarCla = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!nomeCla) {
      setError('O nome do clã é obrigatório.')
      return
    }

    try {
      setLoading(true)
      await criarCla(nomeCla, descCla)
      setSuccess('Guilda fundada com sucesso!')
      setNomeCla('')
      setDescCla('')
      loadData()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Erro ao criar clã.')
    } finally {
      setLoading(false)
    }
  }

  // Action: Invite Player
  const handleBuscaJogador = async (e) => {
    const val = e.target.value
    setBuscaJogador(val)
    if (val.trim().length >= 2) {
      try {
        const res = await buscarJogadoresSemCla(val)
        setJogadoresSemCla(res.data || [])
      } catch (err) {
        console.error(err)
      }
    } else {
      setJogadoresSemCla([])
    }
  }

  const handleConvidar = async (jogadorId) => {
    setError('')
    setSuccess('')
    try {
      setLoading(true)
      await convidarUsuario(jogadorId)
      setSuccess('Convite enviado com sucesso!')
      setBuscaJogador('')
      setJogadoresSemCla([])
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Erro ao enviar convite.')
    } finally {
      setLoading(false)
    }
  }

  // Action: Accept Invite
  const handleAceitarConvite = async (inviteId) => {
    setError('')
    setSuccess('')
    try {
      setLoading(true)
      await aceitarConvite(inviteId)
      setSuccess('Você se juntou à guilda!')
      loadData()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Erro ao aceitar convite.')
    } finally {
      setLoading(false)
    }
  }

  // Action: Decline Invite
  const handleRecusarConvite = async (inviteId) => {
    setError('')
    setSuccess('')
    try {
      setLoading(true)
      await recusarConvite(inviteId)
      setSuccess('Convite recusado.')
      loadData()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Erro ao recusar convite.')
    } finally {
      setLoading(false)
    }
  }

  // Action: Post on Mural
  const handlePostarMural = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!msgMural.trim()) return

    try {
      setLoading(true)
      await postarNoMural(msgMural)
      setMsgMural('')
      // Reload mural
      const resMural = await fetchClasMural()
      setMural(resMural.data || [])
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Erro ao postar recado.')
    } finally {
      setLoading(false)
    }
  }

  // Helper to format dates
  const formatData = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' ' + d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  }

  // VIEW: User has NO clan
  if (error && ranking.length === 0 && !meuCla) {
    return (
      <div className="main-content clas-error-wrapper">
        <ErrorState message={error} onRetry={loadData} />
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="main-content">
        <div className="page-header clas-skeleton-header">
          <div className="skeleton-pulse" style={{ height: '35px', width: '30%', borderRadius: '4px' }}></div>
        </div>
        <div className="clas-skeleton-row">
          <div className="card skeleton-pulse clas-skeleton-card"></div>
          <div className="card skeleton-pulse clas-skeleton-card"></div>
        </div>
      </div>
    )
  }

  if (!meuCla) {
    return (
      <div className="fade-in-up">
        <div className="page-header">
          <h2>🏰 Hall das Guildas</h2>
          <p>Você não pertence a nenhum clã no momento. Funde uma nova guilda ou junte-se a uma existente!</p>
        </div>

        {success && (
          <div className="clas-alert-success">
            {success}
          </div>
        )}
        {error && (
          <div className="clas-alert-error">
            {error}
          </div>
        )}

        <div className="grid-2 clas-grid-top">
          {/* Left Column: Create and Invites */}
          <div className="clas-column">
            {/* Create Clan */}
            <div className="card">
              <div className="card-header mb-1">
                <h3>Fundar Nova Guilda</h3>
              </div>
              <form onSubmit={handleCriarCla} className="clas-form">
                <div className="form-group">
                  <label className="form-label">Nome do Clã / Guilda</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={nomeCla}
                    onChange={e => setNomeCla(e.target.value)}
                    placeholder="Ex: Guerreiros da Cerveja"
                    maxLength="50"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição / Lema</label>
                  <textarea 
                    className="form-input"
                    value={descCla}
                    onChange={e => setDescCla(e.target.value)}
                    placeholder="Ex: Bebemos hidromel e dominamos as navalhas"
                    rows="3"
                    maxLength="250"
                  />
                </div>
                <button type="submit" className="btn btn-primary clas-btn-end" disabled={loading}>
                  Fundar Clã
                </button>
              </form>
            </div>

            {/* Received Invites */}
            <div className="card">
              <div className="card-header mb-1">
                <h3>✉️ Convites de Clãs Recebidos</h3>
              </div>
              
              {convites.length === 0 ? (
                <p className="clas-empty-text">
                  Nenhum convite pendente.
                </p>
              ) : (
                <div className="flex-column gap-0-75">
                  {convites.map(inv => (
                    <div 
                      key={inv.id}
                      className="clas-invite-row"
                    >
                      <div>
                        <strong className="clas-invite-name">{inv.nomeCla}</strong>
                        <div className="clas-invite-meta">
                          Convidado por: {inv.enviadoPor} • {formatData(inv.criadoEm)}
                        </div>
                      </div>
                      <div className="clas-invite-actions">
                        <button 
                          className="btn btn-primary clas-btn-small"
                          onClick={() => handleAceitarConvite(inv.id)}
                          disabled={loading}
                        >
                          Aceitar
                        </button>
                        <button 
                          className="btn btn-ghost clas-btn-decline"
                          onClick={() => handleRecusarConvite(inv.id)}
                          disabled={loading}
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Leaderboard / List */}
          <div className="card">
            <div className="card-header mb-1">
              <h3>Ranking de Guildas</h3>
            </div>
            
            {ranking.length === 0 ? (
              <p className="clas-empty-text">
                Nenhum clã fundado no reino ainda.
              </p>
            ) : (
              <div className="flex-column gap-0-75">
                {ranking.map((rk, idx) => (
                  <div 
                    key={rk.id}
                    className="clas-ranking-row"
                  >
                    <div className="clas-ranking-position" style={{
                      background: idx === 0 ? 'var(--gold)' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--bg-input)',
                      color: idx < 3 ? '#000' : 'var(--text-primary)'
                    }}>
                      {idx + 1}º
                    </div>
                    
                    <div className="clas-ranking-info">
                      <strong className="clas-ranking-name">{rk.nome}</strong>
                      <span className="clas-ranking-subtitle">Líder: {rk.nomeLider} • {rk.membrosQtd} membros</span>
                    </div>

                    <div className="clas-ranking-stats">
                      <span className="rpg-level-badge clas-ranking-level-badge">
                        Nível {rk.nivelAtual}
                      </span>
                      <div className="clas-ranking-xp">
                        {rk.xpColetivo} XP
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // VIEW: User HAS a clan
  const isLider = meuCla.liderId === user.id

  return (
    <div className="fade-in-up">
      {/* Clan Header Banner */}
      <div className="card clas-banner">
        <div>
          <span className="rpg-level-badge clas-banner-level">
            GUILDA NÍVEL {meuCla.nivelAtual}
          </span>
          <h2 className="clas-banner-title">{meuCla.nome}</h2>
          <p className="clas-banner-desc">
            "{meuCla.descricao || 'Nenhum lema cadastrado.'}"
          </p>
        </div>

        <div className="clas-banner-right">
          <div className="clas-banner-xp">
            {meuCla.xpColetivo} XP Coletivo
          </div>
          <div className="clas-banner-members">
            Membros: {membros.length}
          </div>
        </div>
      </div>

      {success && (
        <div className="clas-alert-success">
          {success}
        </div>
      )}
      {error && (
        <div className="clas-alert-error">
          {error}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="clas-tab-menu">
        {[
          { id: 'painel', label: 'Painel do Clã' },
          { id: 'mural', label: '📜 Mural de Recados' },
          { id: 'ranking', label: 'Leaderboard' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`clas-tab-btn ${activeTab === tab.id ? 'clas-tab-btn--active' : 'clas-tab-btn--inactive'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Painel do Clã */}
      {activeTab === 'painel' && (
        <div className="grid-2 clas-grid-top">
          {/* Members list */}
          <div className="card">
            <div className="card-header clas-card-header">
              <h3>Guerreiros do Clã</h3>
            </div>
            
            <div className="flex-column gap-0-75">
              {membros.map(memb => {
                const memIniciais = (memb.nome || 'J')
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
                const isMemLider = memb.cargo === 'Lider' || memb.cargo === 'ViceLider'
                
                return (
                  <div 
                    key={memb.id}
                    className="clas-member-row"
                  >
                    <div className="clas-member-left">
                      <div 
                        className={`clas-member-avatar ${isMemLider ? 'clas-member-avatar--leader' : 'clas-member-avatar--normal'}`}
                      >
                        {memb.avatarUrl ? (
                          <img src={memb.avatarUrl} alt={memb.nome} />
                        ) : memIniciais}
                      </div>
                      <div>
                        <span className="clas-member-name">
                          {memb.nome} {memb.id === user.id && '(Você)'}
                        </span>
                        <div className="clas-member-meta">
                          Patente: {memb.nomeDoNivel} ({memb.xp} XP)
                        </div>
                      </div>
                    </div>

                    <span 
                      className={`rpg-level-badge clas-member-badge ${memb.cargo === 'Lider' ? 'clas-member-badge--lider' : memb.cargo === 'ViceLider' ? 'clas-member-badge--vice' : 'clas-member-badge--normal'}`}
                    >
                      {memb.cargo}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Invite fast search (Lider only) */}
            {isLider && (
              <div className="clas-invite-section">
                <h4 className="clas-invite-title">✉️ Convidar Novos Guerreiros</h4>
                <div className="clas-invite-search">
                  <input 
                    type="text" 
                    className="form-input"
                    value={buscaJogador}
                    onChange={handleBuscaJogador}
                    placeholder="Digite o nome ou login do jogador..."
                  />
                  
                  {jogadoresSemCla.length > 0 && (
                    <div className="clas-invite-dropdown">
                      {jogadoresSemCla.map(jg => (
                        <div 
                          key={jg.id}
                          className="clas-invite-dropdown-item"
                        >
                          <span className="clas-invite-player-name">{jg.nome} <span className="clas-invite-player-login">({jg.login})</span></span>
                          <button 
                            className="btn btn-primary clas-btn-xs"
                            onClick={() => handleConvidar(jg.id)}
                            disabled={loading}
                          >
                            Convidar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quests list */}
          <div className="card">
            <div className="card-header clas-card-header">
              <h3>Missões Semanais da Guilda</h3>
            </div>

            {missoes.length === 0 ? (
              <p className="clas-empty-text">
                Nenhuma missão disponível para esta semana.
              </p>
            ) : (
              <div className="clas-quest-list">
                {missoes.map(mis => {
                  const perc = Math.min((mis.progresso / mis.meta) * 100, 100)
                  return (
                    <div 
                      key={mis.questId}
                      className={`clas-quest-card ${mis.completada ? 'clas-quest-card--complete' : 'clas-quest-card--active'}`}
                    >
                      <div className="clas-quest-header">
                        <div>
                          <strong className={`clas-quest-title ${mis.completada ? 'clas-quest-title--complete' : 'clas-quest-title--active'}`}>
                            {mis.descricao}
                          </strong>
                          <span className="clas-quest-reward">Recompensa: +{mis.xpBonus} XP de Clã</span>
                        </div>
                        {mis.completada ? (
                          <span className="clas-quest-status clas-quest-status--complete">✔ COMPLETADA</span>
                        ) : (
                          <span className="clas-quest-status clas-quest-status--active">{mis.progresso} / {mis.meta}</span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="clas-quest-progress-bar">
                        <div 
                          className={`clas-quest-progress-fill ${mis.completada ? 'clas-quest-progress-fill--complete' : 'clas-quest-progress-fill--active'}`}
                          style={{ width: `${perc}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Mural de Recados (Chat) */}
      {activeTab === 'mural' && (
        <div className="card clas-mural-card">
          <div className="card-header clas-card-header">
            <h3>📜 Mural de Recados da Guilda</h3>
            <p className="clas-mural-subtitle">Deixe avisos e recados para seus companheiros de clã</p>
          </div>

          {/* Mural Message Scroll */}
          <div className="clas-mural-scroll">
            {mural.length === 0 ? (
              <p className="clas-mural-empty">
                Nenhum recado no mural ainda. Seja o primeiro a postar!
              </p>
            ) : (
              mural.map(msg => (
                <div 
                  key={msg.id}
                  className={`clas-mural-msg ${msg.usuarioId === user.id ? 'clas-mural-msg--own' : 'clas-mural-msg--other'}`}
                >
                  <div className="clas-mural-msg-header">
                    <strong className={`clas-mural-msg-author ${msg.usuarioId === user.id ? 'clas-mural-msg-author--own' : 'clas-mural-msg-author--other'}`}>
                      {msg.nomeUsuario}
                    </strong>
                    <span className="clas-mural-msg-time">
                      {formatData(msg.criadoEm)}
                    </span>
                  </div>
                  <p className="clas-mural-msg-body">
                    {msg.mensagem}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Send form */}
          <form onSubmit={handlePostarMural} className="clas-mural-form">
            <input 
              type="text" 
              className="form-input"
              value={msgMural}
              onChange={e => setMsgMural(e.target.value)}
              placeholder="Escreva um recado no mural da guilda..."
              maxLength="300"
              required
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              ✍️ Postar
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT: Leaderboard */}
      {activeTab === 'ranking' && (
        <div className="card clas-leaderboard-card">
          <div className="card-header clas-card-header">
            <h3>Classificação Geral das Guildas</h3>
          </div>

          <div className="flex-column gap-0-75">
            {ranking.map((rk, idx) => (
              <div 
                key={rk.id}
                className={`clas-ranking-row ${rk.id === meuCla.id ? 'clas-ranking-row--own' : ''}`}
              >
                <div className="clas-ranking-position" style={{
                  background: idx === 0 ? 'var(--gold)' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--bg-input)',
                  color: idx < 3 ? '#000' : 'var(--text-primary)'
                }}>
                  {idx + 1}º
                </div>
                
                <div className="clas-ranking-info">
                  <strong className="clas-ranking-name">
                    {rk.nome} {rk.id === meuCla.id && '(Seu Clã)'}
                  </strong>
                  <span className="clas-ranking-subtitle">Líder: {rk.nomeLider} • {rk.membrosQtd} membros</span>
                </div>

                <div className="clas-ranking-stats">
                  <span className="rpg-level-badge clas-ranking-level-badge">
                    Nível {rk.nivelAtual}
                  </span>
                  <div className="clas-ranking-xp">
                    {rk.xpColetivo} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
