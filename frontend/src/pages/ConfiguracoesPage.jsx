import React, { useState, useEffect } from 'react'
import { buscarCliente, atualizarPerfil, fetchConfiguracoes, salvarConfiguracoes } from '../services/api.js'
import PlayerCard from '../components/PlayerCard.jsx'

export default function ConfiguracoesPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Administrador","cargo":"Adm"}')
  const isAdmin = user.cargo === 'Adm' || user.cargo === 'Barbeiro'

  // Admin states
  const [whatsappKey, setWhatsappKey] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [tokenValidacao, setTokenValidacao] = useState('')
  const [nomeEmpresa, setNomeEmpresa] = useState('RuivoBarber')
  const [toast, setToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Client states
  const [clientData, setClientData] = useState(null)
  const [nome, setNome] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 200
        const MAX_HEIGHT = 200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        let quality = 0.8
        let dataUrl = canvas.toDataURL('image/webp', quality)
        
        while (dataUrl.length > 68000 && quality > 0.1) {
          quality -= 0.1
          dataUrl = canvas.toDataURL('image/webp', quality)
        }

        setAvatarUrl(dataUrl)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const loadClientInfo = async () => {
    if (isAdmin) return
    try {
      const res = await buscarCliente(user.id)
      if (res && res.data) {
        setClientData(res.data)
        setNome(res.data.nome || '')
        setLogin(res.data.login || '')
        setAvatarUrl(res.data.avatarUrl || '')
      }
    } catch (err) {
      console.error('Erro ao buscar dados do cliente:', err)
      setNome(user.nome || '')
      setLogin(user.login || '')
      setAvatarUrl(user.avatarUrl || '')
      setClientData(user)
    }
  }

  const loadConfiguracoes = async () => {
    if (!isAdmin) return
    try {
      const res = await fetchConfiguracoes()
      if (res && res.data) {
        setWhatsappKey(res.data.chaveApiWhatsapp || '')
        setWebhookUrl(res.data.urlWebhook || '')
        setTokenValidacao(res.data.tokenValidacao || '')
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    }
  }

  useEffect(() => {
    loadClientInfo()
    loadConfiguracoes()
  }, [])

  const salvarAdmin = async () => {
    try {
      await salvarConfiguracoes({
        chaveApiWhatsapp: whatsappKey,
        urlWebhook: webhookUrl,
        tokenValidacao: tokenValidacao
      })
      setToastMsg('✅ Configurações salvas com sucesso!')
      setToast(true)
      setTimeout(() => setToast(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
      alert('Erro ao salvar as configurações: ' + (err.response?.data?.error || err.message))
    }
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
      const payload = { nome, login, avatarUrl }
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
          avatarUrl: res.data.user.avatarUrl,
        }
        localStorage.setItem('ruivobarber_user', JSON.stringify(updatedUser))
        
        // Atualiza os estados locais
        setClientData(prev => ({
          ...prev,
          nome: res.data.user.nome,
          login: res.data.user.login,
          avatarUrl: res.data.user.avatarUrl,
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
              avatarUrl={avatarUrl}
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

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Aparência do Personagem (Avatar)</label>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {[
                    { id: 'viking', name: 'Viking', src: '/avatars/viking.png' },
                    { id: 'cyborg', name: 'Cyborg', src: '/avatars/cyborg.png' },
                    { id: 'knight', name: 'Knight', src: '/avatars/knight.png' },
                    { id: 'wizard', name: 'Wizard', src: '/avatars/wizard.png' }
                  ].map((preset) => (
                    <div 
                      key={preset.id}
                      onClick={() => setAvatarUrl(preset.src)}
                      style={{
                        position: 'relative',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        border: avatarUrl === preset.src ? '3px solid var(--gold)' : '3px solid transparent',
                        boxShadow: avatarUrl === preset.src ? '0 0 10px var(--gold)' : 'none',
                        transition: 'all 0.2s ease',
                        overflow: 'hidden',
                        backgroundColor: 'var(--bg-input)'
                      }}
                    >
                      <img src={preset.src} alt={preset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ou envie uma foto personalizada:</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      padding: '0.4rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      width: '100%'
                    }}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    A imagem será comprimida automaticamente (máx. 50KB WebP) para economia de dados.
                  </small>
                </div>
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
          <div className="form-group">
            <label className="form-label">Token de Validação Webhook</label>
            <input type="text" className="form-input" value={tokenValidacao} onChange={e => setTokenValidacao(e.target.value)} placeholder="Token de segurança do webhook" />
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
