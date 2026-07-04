import React, { useState, useEffect } from 'react'
import PlayerCard from '../components/PlayerCard.jsx'
import { buscarCliente, fetchLojaItens, comprarItem, equiparItem, desequiparItem } from '../services/api.js'
import ErrorState from '../components/ErrorState.jsx'

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
      <div className="page-header loja-page-header">
        <h2>Loja & Bolsa de Itens</h2>
        <p>Gaste suas moedas de ouro conquistadas nos atendimentos para equipar cosméticos lendários!</p>
      </div>

      {toastMsg && <div className="toast">✅ {toastMsg}</div>}
      {errorMsg && (
        <div className="loja-page-error-msg">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Grid Principal: PlayerCard Preview e Menu da Loja */}
      <div className="loja-page-layout">
        
        {/* Preview do PlayerCard */}
        <div className="loja-page-preview-col">
          <h3 className="loja-page-preview-title">Visualização do Personagem</h3>
          <PlayerCard 
            nome={clientData.nome}
            nivel={clientData.nomeDoNivel || clientData.nivel}
            xp={clientData.xp}
            avatarUrl={clientData.avatarUrl}
            molduraEquipada={clientData.molduraEquipada}
            fundoEquipado={clientData.fundoEquipado}
            efeitoEquipado={clientData.efeitoEquipado}
          />
          <div className="stat-card loja-page-coins-card">
            <div className="label">Suas Moedas Disponíveis</div>
            <div className="value loja-page-coins-val">
              🪙 {moedasDisponiveis}
            </div>
          </div>
        </div>

        {/* Área de Seleção e Abas */}
        <div className="loja-page-content-col">
          <div className="loja-page-tabs">
            <button 
              className={`btn-ghost loja-page-tab-btn ${activeTab === 'loja' ? 'active' : ''}`}
              onClick={() => setActiveTab('loja')}
              style={{
                borderBottom: activeTab === 'loja' ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === 'loja' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'loja' ? 600 : 500
              }}
            >
              Loja de Cosméticos ({itensLoja.length})
            </button>
            <button 
              className={`btn-ghost loja-page-tab-btn ${activeTab === 'inventario' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventario')}
              style={{
                borderBottom: activeTab === 'inventario' ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === 'inventario' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'inventario' ? 600 : 500
              }}
            >
              Meu Inventário ({itensInventario.length})
            </button>
          </div>

          {errorMsg && itensLoja.length === 0 ? (
            <div className="loja-page-error-state-wrapper">
              <ErrorState message={errorMsg} onRetry={loadData} />
            </div>
          ) : loading ? (
            <div className="loja-page-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card skeleton-pulse loja-page-skel-card"></div>
              ))}
            </div>
          ) : activeTab === 'loja' ? (
            itensLoja.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🎉</div>
                <h4>Você já possui todos os itens da loja!</h4>
                <p>Abra a aba "Meu Inventário" para equipá-los.</p>
              </div>
            ) : (
              <div className="loja-page-grid">
                {itensLoja.map(item => {
                  const podeComprar = moedasDisponiveis >= item.preco
                  return (
                    <div key={item.id} className="card loja-page-item-card">
                      <div className="loja-page-item-header">
                        <span className="badge loja-page-item-badge" style={{
                          background: item.tipoItem === 'Moldura' ? '#a0a0b8' : item.tipoItem === 'Background' ? '#00f2fe' : '#b026ff'
                        }}>
                          {item.tipoItem}
                        </span>
                        <span className="loja-page-item-price">
                          🪙 {item.preco}
                        </span>
                      </div>
                      <h4 className="loja-page-item-title">{item.nome}</h4>
                      <p className="loja-page-item-desc">
                        {item.descricao}
                      </p>
                      <button 
                        className="btn-primary loja-page-item-btn" 
                        disabled={!podeComprar}
                        onClick={() => handleComprar(item.id)}
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
                <div className="icon"></div>
                <h4>Seu inventário está vazio</h4>
                <p>Navegue pela "Loja de Cosméticos" para adquirir itens com suas moedas.</p>
              </div>
            ) : (
              <div className="loja-page-grid">
                {itensInventario.map(item => (
                  <div key={item.id} className="card loja-page-item-card" style={{ borderColor: item.equipado ? 'var(--accent)' : 'var(--border)' }}>
                    <div className="loja-page-item-header">
                      <span className="badge loja-page-item-badge" style={{
                        background: item.tipoItem === 'Moldura' ? '#a0a0b8' : item.tipoItem === 'Background' ? '#00f2fe' : '#b026ff'
                      }}>
                        {item.tipoItem}
                      </span>
                      {item.equipado && <span className="loja-page-item-equipped-label">Equipado ✅</span>}
                    </div>
                    <h4 className="loja-page-item-title">{item.nome}</h4>
                    <p className="loja-page-item-desc">
                      {item.descricao}
                    </p>
                    {item.equipado ? (
                      <button 
                        className="btn-ghost loja-page-item-unequip-btn" 
                        onClick={() => handleDesequipar(item.id)}
                      >
                        Desequipar
                      </button>
                    ) : (
                      <button 
                        className="btn-primary loja-page-item-btn" 
                        onClick={() => handleEquipar(item.id)}
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
