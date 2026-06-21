import React, { useState, useEffect } from 'react'
import PlayerCard from '../components/PlayerCard.jsx'
import { fetchHallOfFame } from '../services/api.js'

const mockRanking = [
  { id: 101, nome: 'Vitor "O Bárbaro" Silva', nomeDoNivel: 'Rei da Cadeira', xp: 1250, avatarUrl: '', molduraEquipada: 'frame-royal', fundoEquipado: 'bg-neon-fire', efeitoEquipado: 'glow-pulsing' },
  { id: 102, nome: 'Arthur "Navalha" Pendragon', nomeDoNivel: 'Lenda da Navalha', xp: 870, avatarUrl: '', molduraEquipada: 'frame-gold', fundoEquipado: 'bg-neon-ice', efeitoEquipado: '' },
  { id: 103, nome: 'Thiago Barba Negra', nomeDoNivel: 'Barba de Respeito', xp: 580, avatarUrl: '', molduraEquipada: 'frame-silver', fundoEquipado: '', efeitoEquipado: '' },
  { id: 104, nome: 'Felipe Iniciado', nomeDoNivel: 'Corte Iniciante', xp: 210, avatarUrl: '', molduraEquipada: 'frame-bronze', fundoEquipado: '', efeitoEquipado: '' },
  { id: 105, nome: 'Mateus Do Corte', nomeDoNivel: 'Corte Iniciante', xp: 180, avatarUrl: '', molduraEquipada: 'frame-bronze', fundoEquipado: '', efeitoEquipado: '' },
]

export default function HallOfFamePage() {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const res = await fetchHallOfFame()
        if (res && Array.isArray(res.data)) {
          setRanking(res.data)
        } else {
          setRanking(mockRanking)
        }
      } catch (err) {
        console.error('Erro ao carregar Hall of Fame:', err)
        setError('Não foi possível carregar o ranking oficial, exibindo dados salvos localmente.')
        setRanking(mockRanking)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredRanking = ranking.filter(p => 
    p.nome.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const showPodium = searchQuery === '' && filteredRanking.length >= 3

  return (
    <div className="fade-in-up hof-container">
      <div className="page-header hof-header">
        <h2>🏆 Galeria de Lendários (Hall of Fame)</h2>
        <p>Contemple os grandes campeões da RuivoBarber que alcançaram a glória em nosso RPG de Fidelidade!</p>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          background: 'rgba(233, 69, 96, 0.1)',
          border: '1px solid var(--red)',
          color: 'var(--red)',
          fontSize: '0.85rem',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          ℹ️ {error}
        </div>
      )}

      <div className="search-section">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar campeão por nome..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '1rem', fontSize: '2rem' }}>⌛</div>
          Carregando lendas da barbearia...
        </div>
      ) : filteredRanking.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🛡️</div>
          <h4>Nenhum lendário encontrado</h4>
          <p style={{ color: 'var(--text-secondary)' }}>Nenhum jogador corresponde à sua busca "{searchQuery}".</p>
        </div>
      ) : (
        <>
          {/* Seção do Pódio - Só mostrada sem busca ativa e se houver ao menos 3 lendas */}
          {showPodium && (
            <div>
              <h3 style={{ textAlign: 'center', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>👑 O Pódio de Honra</h3>
              <div className="hof-podium">
                {/* 2º Lugar */}
                <div className="hof-podium-spot second">
                  <div className="hof-podium-card">
                    <PlayerCard 
                      nome={filteredRanking[1].nome} 
                      nivel={filteredRanking[1].nomeDoNivel || filteredRanking[1].nivel || 'Corte Iniciante'} 
                      xp={filteredRanking[1].xp} 
                      avatarUrl={filteredRanking[1].avatarUrl}
                      molduraEquipada={filteredRanking[1].molduraEquipada}
                      fundoEquipado={filteredRanking[1].fundoEquipado}
                      efeitoEquipado={filteredRanking[1].efeitoEquipado}
                    />
                  </div>
                  <div className="hof-pedestal">
                    <span className="hof-rank-num">🥈 2º Lugar</span>
                  </div>
                </div>

                {/* 1º Lugar */}
                <div className="hof-podium-spot first">
                  <div className="hof-podium-card">
                    <PlayerCard 
                      nome={filteredRanking[0].nome} 
                      nivel={filteredRanking[0].nomeDoNivel || filteredRanking[0].nivel || 'Corte Iniciante'} 
                      xp={filteredRanking[0].xp} 
                      avatarUrl={filteredRanking[0].avatarUrl}
                      molduraEquipada={filteredRanking[0].molduraEquipada}
                      fundoEquipado={filteredRanking[0].fundoEquipado}
                      efeitoEquipado={filteredRanking[0].efeitoEquipado}
                    />
                  </div>
                  <div className="hof-pedestal">
                    <span className="hof-rank-num">🥇 1º Lugar</span>
                  </div>
                </div>

                {/* 3º Lugar */}
                <div className="hof-podium-spot third">
                  <div className="hof-podium-card">
                    <PlayerCard 
                      nome={filteredRanking[2].nome} 
                      nivel={filteredRanking[2].nomeDoNivel || filteredRanking[2].nivel || 'Corte Iniciante'} 
                      xp={filteredRanking[2].xp} 
                      avatarUrl={filteredRanking[2].avatarUrl}
                      molduraEquipada={filteredRanking[2].molduraEquipada}
                      fundoEquipado={filteredRanking[2].fundoEquipado}
                      efeitoEquipado={filteredRanking[2].efeitoEquipado}
                    />
                  </div>
                  <div className="hof-pedestal">
                    <span className="hof-rank-num">🥉 3º Lugar</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Seção da Lista de Classificação Geral */}
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header">
              <h3>📜 {showPodium ? 'Classificação Geral' : 'Resultados da Busca'}</h3>
            </div>
            
            <div className="leaderboard-container">
              <div className="leaderboard-row header">
                <div className="leaderboard-rank">Rank</div>
                <div className="leaderboard-avatar-col">Avatar</div>
                <div className="leaderboard-name">Jogador</div>
                <div className="leaderboard-level-col">Nível / Patente</div>
                <div className="leaderboard-xp" style={{ textAlign: 'right' }}>XP Total</div>
              </div>

              {(showPodium ? filteredRanking.slice(3) : filteredRanking).map((player, index) => {
                const actualRank = showPodium ? index + 4 : index + 1
                const iniciais = player.nome.split(' ').map(n => n[0]).slice(0, 2).join('')
                const isTop = actualRank <= 3
                return (
                  <div key={player.id} className="leaderboard-row">
                    <div className={`leaderboard-rank ${isTop ? 'top-rank' : ''}`}>
                      {actualRank === 1 ? '🥇 1º' : actualRank === 2 ? '🥈 2º' : actualRank === 3 ? '🥉 3º' : `${actualRank}º`}
                    </div>
                    <div className="leaderboard-avatar-col">
                      <div className={`leaderboard-mini-avatar ${player.molduraEquipada || ''}`}>
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} alt={player.nome} />
                        ) : (
                          <span>{iniciais}</span>
                        )}
                      </div>
                    </div>
                    <div className="leaderboard-name">
                      {player.nome}
                      {player.efeitoEquipado && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }} title="Equipado com efeito visual!">✨</span>}
                    </div>
                    <div className="leaderboard-level-col">
                      <span className="rpg-level-badge" style={{
                        fontSize: '0.65rem',
                        background: player.nomeDoNivel === 'Rei da Cadeira' ? '#b026ff' : player.nomeDoNivel === 'Lenda da Navalha' ? 'var(--gold)' : player.nomeDoNivel === 'Barba de Respeito' ? '#a0a0b8' : '#8a5a36'
                      }}>
                        {player.nomeDoNivel || player.nivel || 'Corte Iniciante'}
                      </span>
                    </div>
                    <div className="leaderboard-xp" style={{ textAlign: 'right' }}>
                      {player.xp} XP
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
