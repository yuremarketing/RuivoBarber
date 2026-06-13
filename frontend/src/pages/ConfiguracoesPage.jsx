import React, { useState, useEffect } from 'react'
import { buscarCliente, atualizarPerfil } from '../services/api.js'
import PlayerCard from '../components/PlayerCard.jsx'

export default function ConfiguracoesPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Administrador","cargo":"Adm"}')
  const isAdmin = user.cargo === 'Adm' || user.cargo === 'Barbeiro'

  // Admin states
  const [whatsappKey, setWhatsappKey] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [nomeEmpresa, setNomeEmpresa] = useState('RuivoBarber')
  const [toast, setToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Client states
  const [clientData, setClientData] = useState(null)
  const [nome, setNome] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const loadClientInfo = async () => {
    if (isAdmin) return
    try {
      const res = await buscarCliente(user.id)
      if (res && res.data) {
        setClientData(res.data)
        setNome(res.data.nome || '')
        setLogin(res.data.login || '')
      }
    } catch (err) {
      console.error('Erro ao buscar dados do cliente:', err)
      setNome(user.nome || '')
      setLogin(user.login || '')
      setClientData(user)
    }
  }

  useEffect(() => {
    loadClientInfo()
  }, [])

  const salvarAdmin = () => {
    setToastMsg('✅ Configurações salvas com sucesso!')
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  const salvarCliente = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    
    if (senha && senha !== confirmarSenha) {
      setErrorMsg('⚠️ As senhas não conferem.')
      return
    }

    try {
      setLoading(true)
      const payload = { nome, login }
      if (senha) {
        payload.senha = senha
      }
      
      const res = await atualizarPerfil(user.id, payload)
      if (res && res.data) {
        // Atualiza a sessão no localStorage
        const updatedUser = {
          ...user,
          nome: res.data.user.nome,
          login: res.data.user.login,
        }
        localStorage.setItem('ruivobarber_user', JSON.stringify(updatedUser))
        
        // Atualiza os estados locais
        setClientData(prev => ({
          ...prev,
          nome: res.data.user.nome,
          login: res.data.user.login,
        }))
        
        setSenha('')
        setConfirmarSenha('')
        setToastMsg('✅ Perfil atualizado com sucesso!')
        setToast(true)
        setTimeout(() => {
          setToast(false)
          window.location.reload()
        }, 1500)
      }
    } catch (err) {
      console.error('Erro ao salvar perfil:', err)
      const msg = err.response?.data?.error || 'Erro ao atualizar perfil. Tente novamente.'
      setErrorMsg(`❌ ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  // Se o usuário logado for Cliente
  if (!isAdmin) {
    const currentClient = clientData || user
    return (
      <div className="fade-in-up">
        <div className="page-header">
          <h2>⚙️ Minha Conta</h2>
          <p>Gerencie seus dados de acesso e acompanhe sua ficha de RPG</p>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'start', marginTop: '1rem' }}>
          {/* Lado Esquerdo - Ficha RPG */}
          <div style={{ flex: '1', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
            <PlayerCard 
              nome={currentClient.nome} 
              nivel={currentClient.nivel} 
              xp={currentClient.xp} 
            />
            <div className="card" style={{ width: '100%', textAlign: 'center', padding: '1rem' }}>
              <h4 style={{ color: 'var(--gold)', marginBottom: '0.25rem' }}>👑 Patente Atual</h4>
              <span className="rpg-level-badge" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>
                {currentClient.nivel || 'Corte Iniciante'}
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Ganhe XP fazendo agendamentos para subir de nível e desbloquear novas molduras de avatar.
              </p>
            </div>
          </div>

          {/* Lado Direito - Form de Configuração */}
          <div className="card" style={{ flex: '2', minWidth: '350px' }}>
            <div className="card-header" style={{ marginBottom: '1.5rem' }}>
              <h3>📝 Dados Cadastrais</h3>
            </div>
            
            <form onSubmit={salvarCliente} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nome de Usuário / E-mail</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={login} 
                  onChange={e => setLogin(e.target.value)} 
                  required 
                />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />

              <div className="card-header" style={{ padding: 0, marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem' }}>🔑 Alterar Senha (Opcional)</h3>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nova Senha</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={senha} 
                    onChange={e => setSenha(e.target.value)} 
                    placeholder="Deixe em branco para manter" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={confirmarSenha} 
                    onChange={e => setConfirmarSenha(e.target.value)} 
                    placeholder="Deixe em branco para manter" 
                  />
                </div>
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--red)', fontSize: '0.85rem', fontWeight: 500, padding: '0.5rem', borderRadius: '4px', background: 'rgba(255, 75, 75, 0.05)', border: '1px solid var(--red)' }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '💾 Salvando...' : '💾 Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
        {toast && <div className="toast">{toastMsg}</div>}
      </div>
    )
  }

  // Se o usuário logado for Admin ou Barbeiro (Mantém layout original de config de sistema)
  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h2>⚙️ Configurações</h2>
        <p>Configurações gerais do sistema</p>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>🏢 Dados da Empresa</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Nome da Empresa</label>
            <input type="text" className="form-input" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Endereço</label>
            <input type="text" className="form-input" placeholder="Rua, número, bairro" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input type="tel" className="form-input" placeholder="(11) 99999-9999" />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input type="email" className="form-input" placeholder="contato@ruivobarber.com" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>📲 Integrações</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Chave API WhatsApp</label>
            <input type="password" className="form-input" value={whatsappKey} onChange={e => setWhatsappKey(e.target.value)} placeholder="Insira a chave da API" />
          </div>
          <div className="form-group">
            <label className="form-label">URL do Webhook</label>
            <input type="url" className="form-input" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://webhook.example.com" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            🔒 As credenciais são armazenadas de forma segura no servidor.
          </p>
        </div>
      </div>
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3>🎮 Gamificação RPG</h3>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">XP Base por Serviço</label>
            <input type="number" className="form-input" defaultValue="10" />
          </div>
          <div className="form-group">
            <label className="form-label">Multiplicador de XP</label>
            <select className="form-input">
              <option>1.0x (Normal)</option>
              <option>1.5x (Evento Especial)</option>
              <option>2.0x (Evento Duplo XP)</option>
            </select>
          </div>
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button className="btn btn-secondary">Restaurar Padrões</button>
        <button className="btn btn-primary" onClick={salvarAdmin}>💾 Salvar Configurações</button>
      </div>
      {toast && <div className="toast">{toastMsg}</div>}
    </div>
  )
}
