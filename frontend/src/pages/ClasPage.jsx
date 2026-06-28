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

export default function ClasPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Jogador","cargo":"Cliente"}')
  
  const [activeTab, setActiveTab] = useState('painel') // 'painel' | 'mural' | 'ranking'
  const [loading, setLoading] = useState(false)
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
  if (!meuCla) {
    return (
      <div className="fade-in-up">
        <div className="page-header">
          <h2>🏰 Hall das Guildas</h2>
          <p>Você não pertence a nenhum clã no momento. Funde uma nova guilda ou junte-se a uma existente!</p>
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
          {/* Left Column: Create and Invites */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Create Clan */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '1rem' }}>
                <h3>Fundar Nova Guilda</h3>
              </div>
              <form onSubmit={handleCriarCla} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} disabled={loading}>
                  Fundar Clã
                </button>
              </form>
            </div>

            {/* Received Invites */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: '1rem' }}>
                <h3>✉️ Convites de Clãs Recebidos</h3>
              </div>
              
              {convites.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>
                  Nenhum convite pendente.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {convites.map(inv => (
                    <div 
                      key={inv.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px'
                      }}
                    >
                      <div>
                        <strong style={{ color: 'var(--gold)', fontSize: '0.92rem' }}>{inv.nomeCla}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Convidado por: {inv.enviadoPor} • {formatData(inv.criadoEm)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                          onClick={() => handleAceitarConvite(inv.id)}
                          disabled={loading}
                        >
                          Aceitar
                        </button>
                        <button 
                          className="btn btn-ghost" 
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', color: 'var(--red)' }}
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
            <div className="card-header" style={{ marginBottom: '1rem' }}>
              <h3>Ranking de Guildas</h3>
            </div>
            
            {ranking.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>
                Nenhum clã fundado no reino ainda.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {ranking.map((rk, idx) => (
                  <div 
                    key={rk.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      gap: '1rem'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: idx === 0 ? 'var(--gold)' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--bg-input)',
                      color: idx < 3 ? '#000' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      {idx + 1}º
                    </div>
                    
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <strong style={{ color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>{rk.nome}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Líder: {rk.nomeLider} • {rk.membrosQtd} membros</span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="rpg-level-badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                        Nível {rk.nivelAtual}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gold)', marginTop: '0.2rem' }}>
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
      <div 
        className="card" 
        style={{ 
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.95) 0%, rgba(35, 30, 25, 0.95) 100%)', 
          border: '1px solid var(--gold)',
          boxShadow: '0 0 15px rgba(212, 175, 55, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <span className="rpg-level-badge" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', background: 'var(--gold)', color: '#000', fontWeight: 'bold' }}>
            GUILDA NÍVEL {meuCla.nivelAtual}
          </span>
          <h2 style={{ marginTop: '0.5rem', color: '#fff', fontSize: '1.75rem' }}>{meuCla.nome}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem', italic: 'true' }}>
            "{meuCla.descricao || 'Nenhum lema cadastrado.'}"
          </p>
        </div>

        <div style={{ textAlign: 'right', minWidth: '150px' }}>
          <div style={{ color: 'var(--gold)', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {meuCla.xpColetivo} XP Coletivo
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Membros: {membros.length}
          </div>
        </div>
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

      {/* Tabs Menu */}
      <div className="tab-menu" style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'painel', label: 'Painel do Clã' },
          { id: 'mural', label: '📜 Mural de Recados' },
          { id: 'ranking', label: 'Leaderboard' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--gold)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.92rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Painel do Clã */}
      {activeTab === 'painel' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Members list */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <h3>Guerreiros do Clã</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div 
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: isMemLider ? 'linear-gradient(135deg, var(--gold), #ffb700)' : 'var(--bg-input)',
                          color: isMemLider ? '#000' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          overflow: 'hidden'
                        }}
                      >
                        {memb.avatarUrl ? (
                          <img src={memb.avatarUrl} alt={memb.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : memIniciais}
                      </div>
                      <div>
                        <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.92rem' }}>
                          {memb.nome} {memb.id === user.id && '(Você)'}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Patente: {memb.nomeDoNivel} ({memb.xp} XP)
                        </div>
                      </div>
                    </div>

                    <span 
                      className="rpg-level-badge" 
                      style={{ 
                        fontSize: '0.68rem', 
                        padding: '0.15rem 0.5rem', 
                        backgroundColor: memb.cargo === 'Lider' ? 'rgba(212, 175, 55, 0.15)' : memb.cargo === 'ViceLider' ? 'rgba(192, 192, 192, 0.15)' : 'rgba(255,255,255,0.05)',
                        borderColor: memb.cargo === 'Lider' ? 'var(--gold)' : memb.cargo === 'ViceLider' ? '#c0c0c0' : 'var(--border)',
                        color: memb.cargo === 'Lider' ? 'var(--gold)' : memb.cargo === 'ViceLider' ? '#c0c0c0' : 'var(--text-secondary)'
                      }}
                    >
                      {memb.cargo}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Invite fast search (Lider only) */}
            {isLider && (
              <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <h4 style={{ color: 'var(--gold)', marginBottom: '0.5rem', fontSize: '0.92rem' }}>✉️ Convidar Novos Guerreiros</h4>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-input"
                    value={buscaJogador}
                    onChange={handleBuscaJogador}
                    placeholder="Digite o nome ou login do jogador..."
                  />
                  
                  {jogadoresSemCla.length > 0 && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#1a1a20',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        zIndex: 10,
                        marginTop: '0.25rem',
                        maxHeight: '180px',
                        overflowY: 'auto'
                      }}
                    >
                      {jogadoresSemCla.map(jg => (
                        <div 
                          key={jg.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.6rem 0.75rem',
                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                          }}
                        >
                          <span style={{ fontSize: '0.88rem', color: '#fff' }}>{jg.nome} <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({jg.login})</span></span>
                          <button 
                            className="btn btn-primary" 
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
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
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <h3>Missões Semanais da Guilda</h3>
            </div>

            {missoes.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem' }}>
                Nenhuma missão disponível para esta semana.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {missoes.map(mis => {
                  const perc = Math.min((mis.progresso / mis.meta) * 100, 100)
                  return (
                    <div 
                      key={mis.questId}
                      style={{
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: mis.completada ? '1px solid #4CAF50' : '1px solid var(--border)',
                        borderRadius: '6px',
                        boxShadow: mis.completada ? '0 0 10px rgba(76, 175, 80, 0.05)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div>
                          <strong style={{ color: mis.completada ? '#4CAF50' : '#fff', fontSize: '0.9rem', display: 'block' }}>
                            {mis.descricao}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Recompensa: +{mis.xpBonus} XP de Clã</span>
                        </div>
                        {mis.completada ? (
                          <span style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '0.78rem' }}>✔ COMPLETADA</span>
                        ) : (
                          <span style={{ color: 'var(--gold)', fontWeight: 'bold', fontSize: '0.78rem' }}>{mis.progresso} / {mis.meta}</span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${perc}%`, 
                            height: '100%', 
                            backgroundColor: mis.completada ? '#4CAF50' : 'var(--gold)',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease'
                          }} 
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
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <h3>📜 Mural de Recados da Guilda</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deixe avisos e recados para seus companheiros de clã</p>
          </div>

          {/* Mural Message Scroll */}
          <div 
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '1rem',
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            {mural.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2rem' }}>
                Nenhum recado no mural ainda. Seja o primeiro a postar!
              </p>
            ) : (
              mural.map(msg => (
                <div 
                  key={msg.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    backgroundColor: msg.usuarioId === user.id ? 'rgba(212, 175, 55, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    borderLeft: msg.usuarioId === user.id ? '3px solid var(--gold)' : '3px solid var(--border)',
                    maxWidth: '85%',
                    alignSelf: msg.usuarioId === user.id ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.82rem', color: msg.usuarioId === user.id ? 'var(--gold)' : '#fff' }}>
                      {msg.nomeUsuario}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {formatData(msg.criadoEm)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.3', whiteSpace: 'pre-wrap' }}>
                    {msg.mensagem}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Send form */}
          <form onSubmit={handlePostarMural} style={{ display: 'flex', gap: '0.75rem' }}>
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
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <h3>Classificação Geral das Guildas</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ranking.map((rk, idx) => (
              <div 
                key={rk.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: rk.id === meuCla.id ? 'rgba(212, 175, 55, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                  border: rk.id === meuCla.id ? '1px solid var(--gold)' : '1px solid var(--border)',
                  borderRadius: '6px',
                  gap: '1rem',
                  boxShadow: rk.id === meuCla.id ? '0 0 10px rgba(212, 175, 55, 0.05)' : 'none'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: idx === 0 ? 'var(--gold)' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--bg-input)',
                  color: idx < 3 ? '#000' : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  {idx + 1}º
                </div>
                
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <strong style={{ color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                    {rk.nome} {rk.id === meuCla.id && '(Seu Clã)'}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Líder: {rk.nomeLider} • {rk.membrosQtd} membros</span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="rpg-level-badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>
                    Nível {rk.nivelAtual}
                  </span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gold)', marginTop: '0.2rem' }}>
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
