import React, { useEffect, useState, useRef } from 'react'
import PlayerCard from '../components/PlayerCard.jsx'
import RpgProgressBar from '../components/RpgProgressBar.jsx'
import RedeemCouponManager from '../components/RedeemCouponManager.jsx'
import BadgeShowcase from '../components/BadgeShowcase.jsx'
import AvaliacaoModal from '../components/AvaliacaoModal.jsx'
import AgendaConsolidada from '../components/AgendaConsolidada.jsx'
import { buscarCliente, fetchHallOfFame, fetchTemporadaAtiva, fetchMeusBadges, fetchUltimoCorte, fetchGorjetasBarbeiro, confirmarPagamentoGorjeta, fetchDashboard } from '../services/api.js'
import { playLevelUpSound, fireConfetti } from '../services/soundEffects.js'
import ErrorState from '../components/ErrorState.jsx'
// Stats format: { icon, label, value, change }
// Agendamentos format: { id, cliente, servico, barbeiro, horario, status }

export default function DashboardPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Administrador","cargo":"Adm"}')
  const [clientData, setClientData] = useState(null)
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(false)
  const [temporadaAtiva, setTemporadaAtiva] = useState(null)
  const [badges, setBadges] = useState([])
  const [loadingBadges, setLoadingBadges] = useState(false)
  const [ultimoCorte, setUltimoCorte] = useState(null)
  const [showAvaliacaoModal, setShowAvaliacaoModal] = useState(false)
  const [gorjetas, setGorjetas] = useState([])
  const [loadingGorjetas, setLoadingGorjetas] = useState(false)
  const [adminDashboard, setAdminDashboard] = useState({ stats: null, agendamentos: [] })
  const [loadingAdmin, setLoadingAdmin] = useState(true)
  const [error, setError] = useState(null)
 
  const isClient = user.cargo === 'Cliente'
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const previousLevelRef = useRef(null)

 
  const loadRanking = async () => {
    try {
      const res = await fetchHallOfFame()
      if (res && Array.isArray(res.data)) {
        setRanking(res.data)
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

  const loadGorjetas = async () => {
    try {
      setLoadingGorjetas(true)
      const res = await fetchGorjetasBarbeiro(user.id)
      setGorjetas(res.data || [])
    } catch (err) {
      console.error('Erro ao carregar gorjetas:', err)
    } finally {
      setLoadingGorjetas(false)
    }
  }

  const handleConfirmarGorjeta = async (gorjetaId) => {
    if (!window.confirm('Deseja confirmar o recebimento desta gorjeta Pix?')) return
    try {
      await confirmarPagamentoGorjeta(gorjetaId)
      alert('Gorjeta confirmada com sucesso!')
      loadGorjetas()
    } catch (err) {
      console.error('Erro ao confirmar gorjeta:', err)
      alert('Erro ao confirmar pagamento: ' + (err.response?.data?.error || err.message))
    }
  }

  const loadAdminDashboard = async () => {
    try {
      setLoadingAdmin(true)
      setError(null)
      const res = await fetchDashboard()
      if (res.data) {
        setAdminDashboard(res.data)
      }
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err)
      setError('Erro ao carregar dados do dashboard do servidor.')
    } finally {
      setLoadingAdmin(false)
    }
  }

  const loadRealTimeClientData = async () => {
    if (!isClient) return
    try {
      setLoading(true)
      setError(null)
      const res = await buscarCliente(user.id)
      if (res && res.data) {
        setClientData(res.data)
        
        // Verifica se subiu de nível para tocar o som de Level Up
        if (previousLevelRef.current !== null && res.data.nivel > previousLevelRef.current) {
          playLevelUpSound()
          fireConfetti()
        }
        previousLevelRef.current = res.data.nivel
      }
    } catch (err) {
      console.error('Erro ao buscar dados do cliente logado em tempo real:', err)
      setClientData(user)
      setError('Aviso: Utilizando dados salvos localmente. O servidor está inacessível.')
    } finally {
      setLoading(false)
    }
  }

  const loadUltimoCorte = async () => {
    if (!isClient) return
    try {
      const res = await fetchUltimoCorte()
      setUltimoCorte(res.data)
    } catch (err) {
      console.error('Erro ao carregar último corte:', err)
    }
  }
 
  useEffect(() => {
    loadRealTimeClientData()
    loadRanking()
    loadUltimoCorte()

    fetchTemporadaAtiva()
      .then(res => setTemporadaAtiva(res.data))
      .catch(err => {
        if (err.response?.status !== 404) {
          console.error('Erro ao buscar temporada:', err)
        }
      })

    if (isClient) {
      setLoadingBadges(true)
      fetchMeusBadges()
        .then(res => {
          const data = Array.isArray(res.data) ? res.data : []
          setBadges(data)
        })
        .catch(err => {
          console.error('Erro ao buscar badges:', err)
          setBadges([
            { id: 1, nome: 'Primeiro Sangue', descricao: 'Conclua seu 1º atendimento', xpBonus: 50, desbloqueada: false, desbloqueadaEm: null },
            { id: 2, nome: 'Fiel da Navalha', descricao: 'Conclua 5 atendimentos', xpBonus: 50, desbloqueada: false, desbloqueadaEm: null },
            { id: 3, nome: 'Barba de Respeito', descricao: 'Alcance o nível 2', xpBonus: 50, desbloqueada: false, desbloqueadaEm: null },
            { id: 4, nome: 'Lenda Viva', descricao: 'Alcance o nível 3 (patente máxima)', xpBonus: 50, desbloqueada: false, desbloqueadaEm: null },
          ])
        })
        .finally(() => setLoadingBadges(false))
    } else {
      loadGorjetas()
      loadAdminDashboard()
    }
  }, [])


  // ── Render do Dashboard do Cliente (Gamificado) ──
  if (isClient) {
    if (loading) {
      return (
        <div className="fade-in-up">
          <div className="page-header">
            <div className="skeleton-pulse skeleton-text dashboard-page-skel-1"></div>
            <div className="skeleton-pulse skeleton-text dashboard-page-skel-2"></div>
          </div>
          <div className="dashboard-hero-section">
            <div className="dashboard-player-card-wrapper">
               <div className="skeleton-pulse skeleton-card dashboard-page-skel-card"></div>
            </div>
            <div className="card dashboard-rpg-panel">
               <div className="skeleton-pulse skeleton-text dashboard-page-skel-3"></div>
               <div className="skeleton-pulse skeleton-text dashboard-page-skel-4"></div>
               <div className="skeleton-pulse skeleton-text dashboard-page-skel-5"></div>
            </div>
          </div>
        </div>
      )
    }
    const currentClient = clientData || user
    return (
      <div className="fade-in-up page-container">
        {error && (
          <div className="alert-error mb-1">
            ⚠️ {error}
          </div>
        )}
        <div className="page-header">
          <h2>Bem-vindo ao RuivoBarber RPG!</h2>
          <p>Acompanhe sua jornada, ganhe XP nos atendimentos e resgate descontos lendários.</p>
        </div>

        {ultimoCorte && ultimoCorte.avaliacao_pendente && (
          <div className="dashboard-evaluation-card">
            <div className="flex-center gap-1">
              <span className="dashboard-page-eval-icon">⭐</span>
              <div className="dashboard-page-eval-content">
                <h4 className="dashboard-evaluation-title">Como foi seu último corte?</h4>
                <p className="dashboard-evaluation-text">
                  Você foi atendido por <strong>{ultimoCorte.barbeiro_nome}</strong> ({ultimoCorte.servico_nome}). Sua avaliação nos ajuda muito!
                </p>
              </div>
            </div>
            <button 
              className="btn btn-primary dashboard-page-eval-btn" 
              onClick={() => setShowAvaliacaoModal(true)}
            >
              Avaliar Atendimento
            </button>
          </div>
        )}

        <div className="dashboard-hero-section">
          {/* Ficha RPG Principal e Badges */}
          <div className="dashboard-player-card-wrapper flex-column flex-center gap-0">
            <PlayerCard 
              nome={currentClient.nome} 
              nivel={currentClient.nivel} 
              xp={currentClient.xp} 
              avatarUrl={currentClient.avatarUrl}
            />
            
            {/* Vitrine de Conquistas movida para baixo do PlayerCard */}
            <div className="dashboard-page-showcase-wrapper">
              <BadgeShowcase badges={badges} loading={loadingBadges} />
            </div>
          </div>

          {/* Painel de Recompensas e Progresso */}
          <div className="card dashboard-rpg-panel">
            <div className="card-header dashboard-page-rpg-header">
              <h3>Seu Progresso RPG</h3>
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
              <div className="dashboard-season-active">
                <div className="dashboard-page-season-header">
                  <h4 className="dashboard-season-title">Temporada Ativa: {temporadaAtiva.nome}</h4>
                  <span className="dashboard-season-end">
                    Término: {new Date(temporadaAtiva.dataFim).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                  </span>
                </div>
                <p className="dashboard-season-desc">
                  Ganhe o máximo de XP possível até o fim da temporada para obter recompensas adicionais exclusivas!
                </p>
              </div>
            ) : (
              <div className="dashboard-season-inactive">
                ℹ️ Nenhuma temporada ativa no momento. Aproveite para subir de nível e acumular XP base!
              </div>
            )}
          </div>
        </div>


        <div className="card mt-3">
          <div className="card-header">
            <h3>Ranking dos Barbeados (Top Clientes)</h3>
          </div>
          <div className="dashboard-ranking-list">
            {ranking.length === 0 ? (
              <p className="dashboard-ranking-empty">Nenhum cliente cadastrado no ranking.</p>
            ) : (
              ranking.slice(0, 5).map((c, i) => {
                const niveis = { 'Corte Iniciante': 300, 'Barba de Respeito': 600, 'Lenda da Navalha': 1000, 'Rei da Cadeira': 1000 }
                const max = niveis[c.nivel] || 300
                const pct = Math.min((c.xp || 0) / max * 100, 100)
                let numClass = 'dashboard-page-ranking-num--other';
                if (i === 0) numClass = 'dashboard-page-ranking-num--1';
                else if (i === 1) numClass = 'dashboard-page-ranking-num--2';
                else if (i === 2) numClass = 'dashboard-page-ranking-num--3';

                return (
                  <div key={i}>
                    <div className="dashboard-ranking-item">
                      <div>
                        <span className={`dashboard-page-ranking-num ${numClass}`}>
                          {i + 1}º
                        </span>
                        <span className="dashboard-ranking-name">{c.nome}</span>
                        <span className="rpg-level-badge dashboard-ranking-badge">{c.nivel || 'Corte Iniciante'}</span>
                      </div>
                      <span className="dashboard-ranking-xp">{c.xp || 0} XP</span>
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

        <div className="card mt-3">
          <div className="card-header">
            <h3>📜 Regras da Jornada RPG</h3>
          </div>
          <div className="dashboard-rules-grid">
            <div className="dashboard-rule-card">
              <span className="dashboard-rule-title text-accent">💈 Ganhe XP</span>
              <span className="dashboard-rule-desc">A cada serviço concluído você ganha XP automático (Corte Simples = 10 XP, Barba = 15 XP, Corte+Barba = 25 XP).</span>
            </div>
            <div className="dashboard-rule-card">
              <span className="dashboard-rule-title dashboard-page-rule-title-gold">Descontos Lendários</span>
              <span className="dashboard-rule-desc">Resgate cupons conforme atinge as patentes (Nível 2 = 5% off, Nível 3 = 10% off, Nível 4 = 1 Corte Grátis).</span>
            </div>
            <div className="dashboard-rule-card">
              <span className="dashboard-rule-title dashboard-page-rule-title-red">Regra Anti-Falta</span>
              <span className="dashboard-rule-desc">Evite faltas sem aviso prévio. Faltas deduzem 100 XP do seu progresso geral de forma penalizada.</span>
            </div>
          </div>
        </div>
        {showAvaliacaoModal && ultimoCorte && (
          <AvaliacaoModal
            agendamento={ultimoCorte}
            onClose={() => setShowAvaliacaoModal(false)}
            onSuccess={() => {
              loadUltimoCorte()
              loadRealTimeClientData()
              loadRanking()
            }}
          />
        )}
        <div className="card mt-3" style={{ border: '1px solid #FF4D4D', backgroundColor: 'rgba(255, 77, 77, 0.05)' }}>
          <div className="card-header">
            <h3 style={{ color: '#FF4D4D' }}>🛡️ Privacidade e Segurança (LGPD)</h3>
          </div>
          <div style={{ padding: '1rem', color: '#ccc' }}>
            <p style={{ marginBottom: '1rem' }}>
              Seus dados estão protegidos por criptografia de ponta a ponta. Você tem o <strong>Direito ao Esquecimento</strong> garantido pela Lei Geral de Proteção de Dados (LGPD).
            </p>
            <button 
              className="btn" 
              style={{ backgroundColor: '#FF4D4D', color: '#fff', border: 'none' }}
              onClick={async () => {
                if (window.confirm("ATENÇÃO: Deseja realmente excluir sua conta? Seus dados pessoais serão anonimizados e o acesso será perdido irrevogavelmente. As transações financeiras (para relatórios do salão) serão mantidas sem ligação com você.")) {
                  try {
                    const res = await fetch('/api/usuarios/esquecer', {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('ruivobarber_token')}`
                      }
                    });
                    if (!res.ok) throw new Error("Erro ao excluir conta");
                    alert("Conta excluída com sucesso.");
                    localStorage.removeItem('ruivobarber_token');
                    localStorage.removeItem('ruivobarber_user');
                    window.location.href = '/login';
                  } catch (err) {
                    alert(err.message);
                  }
                }
              }}
            >
              Excluir Minha Conta Permanentemente
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render do Dashboard Admin ──
  const adminStats = adminDashboard.stats ? [
    { icon: '👥', label: 'Total Clientes', value: adminDashboard.stats.total_clientes, change: `+${adminDashboard.stats.novos_clientes_mes} este mês` },
    { icon: '📅', label: 'Agendamentos Hoje', value: adminDashboard.stats.agendamentos_hoje, change: `${adminDashboard.stats.pendentes_hoje} pendentes` },
    { icon: '💰', label: 'Receita do Mês', value: `R$ ${adminDashboard.stats.receita_mes.toFixed(2)}`, change: `${adminDashboard.stats.percentual_mes_ant >= 0 ? '+' : ''}${adminDashboard.stats.percentual_mes_ant.toFixed(1)}% vs anterior` },
    { icon: '🎫', label: 'Cupons Ativos', value: adminDashboard.stats.cupons_ativos, change: `${adminDashboard.stats.cupons_resgatados_hoje} resgatados hoje` },
  ] : [
    { icon: '👥', label: 'Total Clientes', value: '-', change: '-' },
    { icon: '📅', label: 'Agendamentos Hoje', value: '-', change: '-' },
    { icon: '💰', label: 'Receita do Mês', value: '-', change: '-' },
    { icon: '🎫', label: 'Cupons Ativos', value: '-', change: '-' },
  ]

  if (!isClient && error) {
    return (
      <div className="fade-in-up page-container padded">
        <ErrorState message={error} onRetry={loadAdminDashboard} />
      </div>
    )
  }

  if (!isClient && loadingAdmin) {
    return (
      <div className="fade-in-up page-container">
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Visão geral do RuivoBarber — {hoje}</p>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card skeleton-pulse dashboard-page-admin-skel-1"></div>
          ))}
        </div>
        <div className="grid-2 dashboard-page-admin-grid-2">
          <div className="card skeleton-pulse dashboard-page-admin-skel-2"></div>
          <div className="card skeleton-pulse dashboard-page-admin-skel-2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in-up page-container">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Visão geral do RuivoBarber — {hoje}</p>
      </div>
      <div className="stats-grid">
        {adminStats.map((s, i) => (
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
            <h3>Agendamentos de Hoje</h3>
            <span className="dashboard-page-admin-total">{adminDashboard.agendamentos.length} total</span>
          </div>
          <div className="table-container">
            {adminDashboard.agendamentos.length === 0 ? (
               <p className="dashboard-page-admin-table-empty">Nenhum agendamento para hoje.</p>
            ) : (
            <table className="data-table">
              <thead><tr><th>Cliente</th><th>Serviço</th><th>Barbeiro</th><th>Hora</th><th>Status</th></tr></thead>
              <tbody>
                {adminDashboard.agendamentos.map(a => (
                  <tr key={a.id}>
                    <td className="dashboard-page-admin-td-client">{a.cliente}</td>
                    <td>{a.servico}</td>
                    <td>{a.barbeiro}</td>
                    <td><strong>{a.horario}</strong></td>
                    <td><span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Top Clientes RPG</h3>
          </div>
          <div className="dashboard-ranking-list">
            {ranking.length === 0 ? (
              <p className="dashboard-ranking-empty">Nenhum cliente cadastrado no ranking.</p>
            ) : (
              ranking.slice(0, 5).map((c, i) => {
                const niveis = { 'Corte Iniciante': 300, 'Barba de Respeito': 600, 'Lenda da Navalha': 1000, 'Rei da Cadeira': 1000 }
                const max = niveis[c.nivel] || 300
                const pct = Math.min((c.xp || 0) / max * 100, 100)
                let numClass = 'dashboard-page-ranking-num--other';
                if (i === 0) numClass = 'dashboard-page-ranking-num--1';
                else if (i === 1) numClass = 'dashboard-page-ranking-num--2';
                else if (i === 2) numClass = 'dashboard-page-ranking-num--3';
                
                return (
                  <div key={i}>
                    <div className="dashboard-ranking-item">
                      <div>
                        <span className={`dashboard-page-ranking-num ${numClass}`}>
                          {i + 1}º
                        </span>
                        <span className="dashboard-ranking-name">{c.nome}</span>
                        <span className="rpg-level-badge dashboard-ranking-badge">{c.nivel || 'Corte Iniciante'}</span>
                      </div>
                      <span className="dashboard-ranking-xp">{c.xp || 0} XP</span>
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
      
      <div className="dashboard-page-admin-agenda">
        <AgendaConsolidada />
      </div>

      {/* Seção de Gorjetas Pix Recebidas */}
      <div className="card mt-3">
        <div className="card-header">
          <h3>Registro de Gorjetas Pix Recebidas</h3>
          <span className="dashboard-page-admin-total">{gorjetas.length} total</span>
        </div>
        <div className="table-container mt-1">
          {loadingGorjetas ? (
            <div className="skeleton-pulse dashboard-page-admin-gorjetas-skel"></div>
          ) : gorjetas.length === 0 ? (
            <p className="dashboard-page-admin-gorjetas-empty">Nenhuma gorjeta recebida.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {gorjetas.map(g => (
                  <tr key={g.id}>
                    <td>#{g.id}</td>
                    <td>{new Date(g.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="dashboard-page-admin-td-client">{g.cliente_nome || `Cliente #${g.cliente_id}`}</td>
                    <td className="dashboard-page-admin-gorjeta-val">R$ {g.valor ? g.valor.toFixed(2) : '0.00'}</td>
                    <td>
                      <span className={`badge badge-${g.status.toLowerCase()}`}>
                        {g.status}
                      </span>
                    </td>
                    <td>
                      {g.status === 'Pendente' ? (
                        <button 
                          className="btn btn-primary btn-sm dashboard-page-admin-gorjeta-btn" 
                          onClick={() => handleConfirmarGorjeta(g.id)}
                        >
                          Confirmar Recebimento
                        </button>
                      ) : (
                        <span className="dashboard-page-admin-gorjeta-ok">Confirmado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
