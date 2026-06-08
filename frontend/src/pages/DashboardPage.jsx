import React, { useEffect, useState } from 'react'
import PlayerCard from '../components/PlayerCard.jsx'
import RpgProgressBar from '../components/RpgProgressBar.jsx'
import RedeemCouponManager from '../components/RedeemCouponManager.jsx'
import { buscarCliente } from '../services/api.js'

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

const topClientes = [
  { nome: 'João Silva', nivel: 'Barba de Respeito', xp: 320, max: 600 },
  { nome: 'Pedro Santos', nivel: 'Lenda da Navalha', xp: 580, max: 600 },
  { nome: 'André Costa', nivel: 'Corte Iniciante', xp: 75, max: 100 },
]

export default function DashboardPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Administrador","cargo":"Adm"}')
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(false)

  const isClient = user.cargo === 'Cliente'
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

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
      // Fallback para dados locais da sessão se a chamada de API falhar (ex: offline/mock)
      setClientData(user)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRealTimeClientData()
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
          {topClientes.map((c, i) => (
            <div key={i} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem' }}>{c.nome}</strong>
                  <span className="rpg-level-badge" style={{ marginLeft: '0.5rem', fontSize: '0.6rem' }}>{c.nivel}</span>
                </div>
                <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.85rem' }}>{c.xp} / {c.max} XP</span>
              </div>
              <div className="xp-bar">
                <div className="xp-bar-fill" style={{ width: `${(c.xp / c.max * 100).toFixed(0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
