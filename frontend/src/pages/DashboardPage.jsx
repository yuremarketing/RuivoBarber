import React, { useEffect, useState } from 'react'
import PlayerCard from '../components/PlayerCard.jsx'
import RpgProgressBar from '../components/RpgProgressBar.jsx'
import RedeemCouponManager from '../components/RedeemCouponManager.jsx'
import BadgeShowcase from '../components/BadgeShowcase.jsx'
import { buscarCliente, listarClientes, fetchTemporadaAtiva, fetchMeusBadges } from '../services/api.js'


const stats = [
  { icon: '👥', label: 'Total Clientes', value: '47', change: '+5 este mês' },
  { icon: '📅', label: 'Agendamentos Hoje', value: '12', change: '3 pendentes' },
  { icon: '💰', label: 'Receita do Mês', value: 'R$ 4.280', change: '+18% vs anterior' },
  { icon: '🎟️', label: 'Cupons Ativos', value: '8', change: '2 resgatados hoje' },
 ]
 
const agendamentos = [
  { id: 1, cliente: 'João Silva', servico: 'Corte + Barba', barbeiro: 'Carlos', horario: '10:00', status: 'Confirmado' },
  { id: 2, cliente: 'Pedro Santos', servico: 'Corte Simples', barbeiro: 'Ricardo', horario: '11:30', status: 'Pendente' },
  { id: 3, cliente: 'André Costa', servico: 'Barba Completa', barbeiro: 'Carlos', horario: '14:00', status: 'Pendente' },
  { id: 4, cliente: 'Marcos Oliveira', servico: 'Hidratação Capilar', barbeiro: 'Ricardo', horario: '15:30', status: 'Confirmado' },
  { id: 5, cliente: 'Lucas Ferreira', servico: 'Corte + Barba', barbeiro: 'Carlos', horario: '16:00', status: 'Concluido' },
]

export default function DashboardPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Administrador","cargo":"Adm"}')
  const [clientData, setClientData] = useState(null)
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(false)
  const [temporadaAtiva, setTemporadaAtiva] = useState(null)
  const [badges, setBadges] = useState([])
  const [loadingBadges, setLoadingBadges] = useState(false)
 
  const isClient = user.cargo === 'Cliente'
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

 
  const loadRanking = async () => {
    try {
      const res = await listarClientes()
      if (res && Array.isArray(res.data)) {
        const sorted = [...res.data].sort((a, b) => (b.xp || 0) - (a.xp || 0))
        setRanking(sorted)
      }
    } catch (err) {
      console.error('Erro ao buscar ranking:', err)
      setRanking([
        { nome: 'João Silva', nivel: 'Barba de Respeito', xp: 320 },
        { nome: 'Pedro Santos', nivel: 'Lenda da Navalha', xp: 580 },
        { nome: 'André Costa', nivel: 'Corte Iniciante', xp: 75 },
      ])
    }
  }

  const loadRealTimeClientData = async () => {
    if (!isClient) return
    try {
      setLoading(true)
      const res = await buscarCliente(user.id)
      if (res && res.data) {
        setClientData(res.data)
      }
    } catch (err) {
      console.error('Erro ao buscar dados do cliente logado em tempo real:', err)
      setClientData(user)
    } finally {
      setLoading(false)
    }
  }
 
  useEffect(() => {
    loadRealTimeClientData()
    loadRanking()

    fetchTemporadaAtiva()
      .then(res => setTemporadaAtiva(res.data))
      .catch(err => console.log('Sem temporada ativa cadastrada ou erro:', err))

    if (isClient) {
      setLoadingBadges(true)
      fetchMeusBadges()
        .then(res => {
          const data = Array.isArray(res.data) ? res.data : []
          setBadges(data)
        })
        .catch(err => {
          console.error('Erro ao buscar badges:', err)
          // Fallback: mostra os badges do sistema todos bloqueados
          setBadges([
            { id: 1, nome: 'Primeiro Sangue', descricao: 'Conclua seu 1º atendimento', xpBonus: 50, desbloqueada: false, desbloqueadaEm: null },
            { id: 2, nome: 'Fiel da Navalha', descricao: 'Conclua 5 atendimentos', xpBonus: 50, desbloqueada: false, desbloqueadaEm: null },
            { id: 3, nome: 'Barba de Respeito', descricao: 'Alcance o nível 2', xpBonus: 50, desbloqueada: false, desbloqueadaEm: null },
            { id: 4, nome: 'Lenda Viva', descricao: 'Alcance o nível 3 (patente máxima)', xpBonus: 50, desbloqueada: false, desbloqueadaEm: null },
          ])
        })
        .finally(() => setLoadingBadges(false))
    }
  }, [])


  // ── Render do Dashboard do Cliente (Gamificado) ──
  if (isClient) {
    const currentClient = clientData || user
    return (
      <div className="fade-in-up">
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <h2>⚔️ Bem-vindo ao RuivoBarber RPG!</h2>
          <p>Acompanhe sua jornada, ganhe XP nos atendimentos e resgate descontos lendários.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'start' }}>
          {/* Ficha RPG Principal */}
          <div style={{ flex: '1', minWidth: '280px', display: 'flex', justifyContent: 'center' }}>
            <PlayerCard 
              nome={currentClient.nome} 
              nivel={currentClient.nivel} 
              xp={currentClient.xp} 
              avatarUrl={currentClient.avatarUrl}
            />
          </div>

          {/* Painel de Recompensas e Progresso */}
          <div className="card" style={{ flex: '1.5', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card-header" style={{ paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              <h3>🔥 Seu Progresso RPG</h3>
            </div>
            
            <RpgProgressBar 
              xpAtual={currentClient.xp} 
              nivel={currentClient.nivel} 
            />
            
            <RedeemCouponManager 
              clienteId={currentClient.id} 
              xpAtual={currentClient.xp}
              onRedeemSuccess={() => {
                // Atualizar dados em tempo real após resgatar cupom
                loadRealTimeClientData()
              }}
            />

            {temporadaAtiva ? (
              <div style={{ 
                padding: '1rem', 
                borderRadius: '8px', 
                background: 'linear-gradient(135deg, rgba(233,69,96,0.1), rgba(245,166,35,0.1))', 
                border: '1px solid rgba(233,69,96,0.3)',
                marginTop: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ color: '#f5a623', margin: 0, fontSize: '0.95rem' }}>⏳ Temporada Ativa: {temporadaAtiva.nome}</h4>
                  <span style={{ fontSize: '0.72rem', color: '#e94560', fontWeight: 'bold' }}>
                    Término: {new Date(temporadaAtiva.dataFim).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: 0 }}>
                  Ganhe o máximo de XP possível até o fim da temporada para obter recompensas adicionais exclusivas!
                </p>
              </div>
            ) : (
              <div style={{ 
                padding: '1rem', 
                borderRadius: '8px', 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid rgba(255,255,255,0.05)',
                marginTop: '1rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                ℹ️ Nenhuma temporada ativa no momento. Aproveite para subir de nível e acumular XP base!
              </div>
            )}

            {/* Vitrine de Conquistas */}
            <BadgeShowcase badges={badges} loading={loadingBadges} />
          </div>
        </div>


        <div className="card" style={{ marginTop: '2.5rem' }}>
          <div className="card-header">
            <h3>🏆 Ranking dos Barbeados (Top Clientes)</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {ranking.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum cliente cadastrado no ranking.</p>
            ) : (
              ranking.slice(0, 5).map((c, i) => {
                const niveis = { 'Corte Iniciante': 300, 'Barba de Respeito': 600, 'Lenda da Navalha': 1000, 'Rei da Cadeira': 1000 }
                const max = niveis[c.nivel] || 300
                const pct = Math.min((c.xp || 0) / max * 100, 100)
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <div>
                        <span style={{ marginRight: '0.5rem', fontWeight: 'bold', color: i === 0 ? 'var(--gold)' : i === 1 ? 'silver' : i === 2 ? '#cd7f32' : 'var(--text-muted)' }}>
                          {i + 1}º
                        </span>
                        <strong style={{ fontSize: '0.85rem' }}>{c.nome}</strong>
                        <span className="rpg-level-badge" style={{ marginLeft: '0.5rem', fontSize: '0.55rem' }}>{c.nivel || 'Corte Iniciante'}</span>
                      </div>
                      <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.8rem' }}>{c.xp || 0} XP</span>
                    </div>
                    <div className="xp-bar">
                      <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="card" style={{ marginTop: '2.5rem' }}>
          <div className="card-header">
            <h3>📜 Regras da Jornada RPG</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', padding: '0.5rem 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '0.25rem' }}>💈 Ganhe XP</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>A cada serviço concluído você ganha XP automático (Corte Simples = 10 XP, Barba = 15 XP, Corte+Barba = 25 XP).</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <strong style={{ color: 'var(--gold)', display: 'block', marginBottom: '0.25rem' }}>🎟️ Descontos Lendários</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Resgate cupons conforme atinge as patentes (Nível 2 = 5% off, Nível 3 = 10% off, Nível 4 = 1 Corte Grátis).</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <strong style={{ color: 'var(--red)', display: 'block', marginBottom: '0.25rem' }}>🛡️ Regra Anti-Falta</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Evite faltas sem aviso prévio. Faltas deduzem 100 XP do seu progresso geral de forma penalizada.</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Render do Dashboard Admin ──
  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h2>📊 Dashboard</h2>
        <p>Visão geral do RuivoBarber — {hoje}</p>
      </div>
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="icon">{s.icon}</div>
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
            <div className="change">{s.change}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>📅 Agendamentos de Hoje</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{agendamentos.length} total</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Cliente</th><th>Serviço</th><th>Barbeiro</th><th>Hora</th><th>Status</th></tr></thead>
              <tbody>
                {agendamentos.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.cliente}</td>
                    <td>{a.servico}</td>
                    <td>{a.barbeiro}</td>
                    <td><strong>{a.horario}</strong></td>
                    <td><span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>⚔️ Top Clientes RPG</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {ranking.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum cliente cadastrado no ranking.</p>
            ) : (
              ranking.slice(0, 5).map((c, i) => {
                const niveis = { 'Corte Iniciante': 300, 'Barba de Respeito': 600, 'Lenda da Navalha': 1000, 'Rei da Cadeira': 1000 }
                const max = niveis[c.nivel] || 300
                const pct = Math.min((c.xp || 0) / max * 100, 100)
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <div>
                        <span style={{ marginRight: '0.5rem', fontWeight: 'bold', color: i === 0 ? 'var(--gold)' : i === 1 ? 'silver' : i === 2 ? '#cd7f32' : 'var(--text-muted)' }}>
                          {i + 1}º
                        </span>
                        <strong style={{ fontSize: '0.85rem' }}>{c.nome}</strong>
                        <span className="rpg-level-badge" style={{ marginLeft: '0.5rem', fontSize: '0.55rem' }}>{c.nivel || 'Corte Iniciante'}</span>
                      </div>
                      <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.8rem' }}>{c.xp || 0} XP</span>
                    </div>
                    <div className="xp-bar">
                      <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
