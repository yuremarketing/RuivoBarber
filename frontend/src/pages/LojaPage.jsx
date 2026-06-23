import React, { useState, useEffect } from 'react'
import PlayerCard from '../components/PlayerCard.jsx'
import { fetchLojaItens, comprarItem, equiparItem, desequiparItem, buscarCliente } from '../services/api.js'

const mockItems = [
  { id: 1, nome: 'Moldura de Ouro', descricao: 'Moldura dourada premium para o seu Card de Jogador', preco: 200, tipoItem: 'Moldura', styleClass: 'frame-gold', comprado: false, equipado: false },
  { id: 2, nome: 'Fundo Neon de Fogo', descricao: 'Fundo animado de chamas neon para o seu Card', preco: 350, tipoItem: 'Background', styleClass: 'bg-neon-fire', comprado: false, equipado: false },
  { id: 3, nome: 'Fundo Neon de Gelo', descricao: 'Fundo animado de cristais de gelo neon para o seu Card', preco: 350, tipoItem: 'Background', styleClass: 'bg-neon-ice', comprado: false, equipado: false },
  { id: 4, nome: 'Efeito Sombra Pulsante', descricao: 'Efeito de brilho neon pulsante ao redor do seu Card', preco: 500, tipoItem: 'Efeito', styleClass: 'glow-pulsing', comprado: false, equipado: false }
]

export default function LojaPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Jogador","cargo":"Cliente"}')
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('loja') // 'loja' ou 'inventario'
  const [clientData, setClientData] = useState(user)
  const [toastMsg, setToastMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [resItens, resCliente] = await Promise.all([
        fetchLojaItens(),
        buscarCliente(user.id)
      ])
      
      if (resItens && Array.isArray(resItens.data)) {
        setItems(resItens.data)
      } else {
        setItems(mockItems)
      }

      if (resCliente && resCliente.data) {
        setClientData(resCliente.data)
        // Atualizar localStorage para manter o nível/moedas atualizados na sidebar
        const updatedUser = { ...user, ...resCliente.data }
        localStorage.setItem('ruivobarber_user', JSON.stringify(updatedUser))
      }
    } catch (err) {
      console.error('Erro ao carregar dados da loja/cliente:', err)
      setItems(mockItems)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  const handleComprar = async (id) => {
    try {
      await comprarItem(id)
      showToast('Item comprado com sucesso! Verifique seu inventário.')
      loadData()
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.error || 'Erro ao efetuar a compra do item.'
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  const handleEquipar = async (id) => {
    try {
      await equiparItem(id)
      showToast('Item equipado com sucesso!')
      loadData()
    } catch (err) {
      console.error(err)
      setErrorMsg('Erro ao equipar item.')
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  const handleDesequipar = async (id) => {
    try {
      await desequiparItem(id)
      showToast('Item desequipado com sucesso!')
      loadData()
    } catch (err) {
      console.error(err)
      setErrorMsg('Erro ao desequipar item.')
      setTimeout(() => setErrorMsg(''), 4000)
    }
  }

  const moedasDisponiveis = clientData.moedas || 0

  // Separar itens para exibição nas abas
  const itensLoja = items.filter(i => !i.comprado)
  const itensInventario = items.filter(i => i.comprado)

  return (
    <div className="fade-in-up">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h2>🎒 Loja & Bolsa de Itens</h2>
        <p>Gaste suas moedas de ouro conquistadas nos atendimentos para equipar cosméticos lendários!</p>
      </div>

      {toastMsg && <div className="toast">✅ {toastMsg}</div>}
      {errorMsg && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', padding: '0.85rem 1.25rem',
          background: 'rgba(233, 69, 96, 0.95)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)',
          color: '#fff', fontSize: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.3s ease', zIndex: 300
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Grid Principal: PlayerCard Preview e Menu da Loja */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'start' }}>
        
        {/* Preview do PlayerCard */}
        <div style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Visualização do Personagem</h3>
          <PlayerCard 
            nome={clientData.nome}
            nivel={clientData.nomeDoNivel || clientData.nivel}
            xp={clientData.xp}
            avatarUrl={clientData.avatarUrl}
            molduraEquipada={clientData.molduraEquipada}
            fundoEquipado={clientData.fundoEquipado}
            efeitoEquipado={clientData.efeitoEquipado}
          />
          <div className="stat-card" style={{ width: '100%', maxWidth: '400px', background: 'rgba(22, 33, 62, 0.4)', border: '1px solid var(--border)', textAlign: 'center', padding: '1rem' }}>
            <div className="label">Suas Moedas Disponíveis</div>
            <div className="value" style={{ color: 'var(--gold)', fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>
              🪙 {moedasDisponiveis}
            </div>
          </div>
        </div>

        {/* Área de Seleção e Abas */}
        <div style={{ flex: '2', minWidth: '320px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <button 
              className={`btn-ghost ${activeTab === 'loja' ? 'active' : ''}`}
              onClick={() => setActiveTab('loja')}
              style={{
                paddingBottom: '0.75rem', 
                borderBottom: activeTab === 'loja' ? '2px solid var(--accent)' : '2px solid transparent',
                borderRadius: 0,
                color: activeTab === 'loja' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'loja' ? 600 : 500
              }}
            >
              🛒 Loja de Cosméticos ({itensLoja.length})
            </button>
            <button 
              className={`btn-ghost ${activeTab === 'inventario' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventario')}
              style={{
                paddingBottom: '0.75rem', 
                borderBottom: activeTab === 'inventario' ? '2px solid var(--accent)' : '2px solid transparent',
                borderRadius: 0,
                color: activeTab === 'inventario' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'inventario' ? 600 : 500
              }}
            >
              🎒 Meu Inventário ({itensInventario.length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
              ⌛ Carregando itens...
            </div>
          ) : activeTab === 'loja' ? (
            itensLoja.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🎉</div>
                <h4>Você já possui todos os itens da loja!</h4>
                <p>Abra a aba "Meu Inventário" para equipá-los.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
                {itensLoja.map(item => {
                  const podeComprar = moedasDisponiveis >= item.preco
                  return (
                    <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span className="badge" style={{
                          background: item.tipoItem === 'Moldura' ? '#a0a0b8' : item.tipoItem === 'Background' ? '#00f2fe' : '#b026ff',
                          color: '#fff', fontSize: '0.65rem'
                        }}>
                          {item.tipoItem}
                        </span>
                        <span style={{ color: 'var(--gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          🪙 {item.preco}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>{item.nome}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexGrow: 1, margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                        {item.descricao}
                      </p>
                      <button 
                        className="btn-primary" 
                        disabled={!podeComprar}
                        onClick={() => handleComprar(item.id)}
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      >
                        {podeComprar ? 'Comprar Item' : 'Moedas Insuficientes'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            itensInventario.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🎒</div>
                <h4>Seu inventário está vazio</h4>
                <p>Navegue pela "Loja de Cosméticos" para adquirir itens com suas moedas.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
                {itensInventario.map(item => (
                  <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderColor: item.equipado ? 'var(--accent)' : 'var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className="badge" style={{
                        background: item.tipoItem === 'Moldura' ? '#a0a0b8' : item.tipoItem === 'Background' ? '#00f2fe' : '#b026ff',
                        color: '#fff', fontSize: '0.65rem'
                      }}>
                        {item.tipoItem}
                      </span>
                      {item.equipado && <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.75rem' }}>Equipado ✅</span>}
                    </div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-primary)' }}>{item.nome}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexGrow: 1, margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                      {item.descricao}
                    </p>
                    {item.equipado ? (
                      <button 
                        className="btn-ghost" 
                        onClick={() => handleDesequipar(item.id)}
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem', borderColor: 'var(--red)', color: 'var(--red)' }}
                      >
                        Desequipar
                      </button>
                    ) : (
                      <button 
                        className="btn-primary" 
                        onClick={() => handleEquipar(item.id)}
                        style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                      >
                        Equipar Item
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
