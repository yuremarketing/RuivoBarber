import React, { useState, useEffect } from 'react'
import { buscarCliente, atualizarPerfil, fetchConfiguracoes, salvarConfiguracoes } from '../services/api.js'
import PlayerCard from '../components/PlayerCard.jsx'
import ErrorState from '../components/ErrorState.jsx'

export default function ConfiguracoesPage() {
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Administrador","cargo":"Adm"}')
  const isAdmin = user.cargo === 'Adm' || user.cargo === 'Barbeiro'

  // Tabs
  const [activeTab, setActiveTab] = useState('perfil') // 'perfil' | 'sistema'

  // Admin states
  const [whatsappKey, setWhatsappKey] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [tokenValidacao, setTokenValidacao] = useState('')
  const [nomeEmpresa, setNomeEmpresa] = useState('RuivoBarber')
  const [toast, setToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [aceitaDinheiro, setAceitaDinheiro] = useState(true)
  const [aceitaPix, setAceitaPix] = useState(true)
  const [aceitaCartao, setAceitaCartao] = useState(true)
  const [chavePix, setChavePix] = useState('')
  const [mercadoPagoToken, setMercadoPagoToken] = useState('')

  // Client/User states
  const [clientData, setClientData] = useState(null)
  const [nome, setNome] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsappConsent, setWhatsappConsent] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
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

  const loadUserInfo = async () => {
    try {
      const res = await buscarCliente(user.id)
      if (res && res.data) {
        setClientData(res.data)
        setNome(res.data.nome || '')
        setLogin(res.data.login || '')
        setAvatarUrl(res.data.avatarUrl || '')
        setTelefone(res.data.telefone || '')
        setWhatsappConsent(res.data.whatsappConsent !== false) // default true if undefined
      }
    } catch (err) {
      console.error('Erro ao buscar dados do usuario:', err)
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
        setAceitaDinheiro(res.data.aceitaDinheiro !== false)
        setAceitaPix(res.data.aceitaPix !== false)
        setAceitaCartao(res.data.aceitaCartao !== false)
        setChavePix(res.data.chavePix || '')
        setMercadoPagoToken(res.data.mercadoPagoToken || '')
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
      setError('Não foi possível carregar as configurações do servidor.')
    }
  }

  const loadAllData = async () => {
    setInitialLoading(true)
    await loadUserInfo()
    if (isAdmin) {
      await loadConfiguracoes()
    }
    setInitialLoading(false)
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const salvarAdmin = async () => {
    try {
      await salvarConfiguracoes({
        chaveApiWhatsapp: whatsappKey,
        urlWebhook: webhookUrl,
        tokenValidacao: tokenValidacao,
        aceitaDinheiro: aceitaDinheiro,
        aceitaPix: aceitaPix,
        aceitaCartao: aceitaCartao,
        chavePix: chavePix,
        mercadoPagoToken: mercadoPagoToken
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
      const payload = { nome, login, avatarUrl, telefone, whatsappConsent }
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

  if (initialLoading) {
    return (
      <div className="main-content config-page-padded-layout">
        <div className="page-header config-page-header-skel-wrapper">
          <div className="skeleton-pulse config-page-header-skel"></div>
        </div>
        <div className="config-page-grid-2">
          <div className="card skeleton-pulse config-page-skel-card"></div>
          <div className="card skeleton-pulse config-page-skel-card"></div>
        </div>
      </div>
    )
  }

  const currentClient = clientData || user

  const renderProfileTab = () => (
    <div className="config-page-client-layout">
      {/* Lado Esquerdo - Ficha RPG */}
      {!isAdmin && (
        <div className="config-page-client-left">
          <PlayerCard 
            nome={currentClient.nome} 
            nivel={currentClient.nivel} 
            xp={currentClient.xp} 
            avatarUrl={avatarUrl}
          />
          <div className="card config-page-patente-card dota-card">
            <h4 className="config-page-patente-title">👑 Patente Atual</h4>
            <span className="rpg-level-badge config-page-patente-badge">
              {currentClient.nivel || 'Corte Iniciante'}
            </span>
            <p className="config-page-patente-desc" style={{color: 'var(--text-secondary)'}}>
              Ganhe XP fazendo agendamentos para subir de nível e desbloquear novas molduras de avatar.
            </p>
          </div>
        </div>
      )}

      {/* Lado Direito - Form de Configuração */}
      <div className={`card config-page-client-right dota-card ${isAdmin ? 'admin-full-width' : ''}`} style={isAdmin ? { width: '100%', maxWidth: '800px', margin: '0 auto' } : {}}>
        <div className="card-header config-page-card-header">
          <h3 style={{fontFamily: 'var(--font-display)', color: 'var(--gold)'}}>📝 Dados Cadastrais</h3>
        </div>
        
        <form onSubmit={salvarCliente} className="config-page-form">
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Login / E-mail</label>
              <input 
                type="text" 
                className="form-input" 
                value={login} 
                onChange={e => setLogin(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Celular / WhatsApp</label>
              <input 
                type="tel" 
                className="form-input" 
                value={telefone} 
                onChange={e => setTelefone(e.target.value)} 
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label config-page-avatar-label">Aparência do Personagem (Avatar)</label>
            <div className="config-page-avatar-presets">
              {[
                { id: 'viking', name: 'Viking', src: '/avatars/viking.png' },
                { id: 'cyborg', name: 'Cyborg', src: '/avatars/cyborg.png' },
                { id: 'knight', name: 'Knight', src: '/avatars/knight.png' },
                { id: 'wizard', name: 'Wizard', src: '/avatars/wizard.png' }
              ].map((preset) => (
                <div 
                  key={preset.id}
                  onClick={() => setAvatarUrl(preset.src)}
                  className="config-page-avatar-preset"
                  style={{
                    border: avatarUrl === preset.src ? '2px solid var(--accent)' : '2px solid transparent',
                    boxShadow: avatarUrl === preset.src ? '0 0 15px var(--accent-60)' : 'none',
                    borderRadius: '4px'
                  }}
                >
                  <img src={preset.src} alt={preset.name} className="config-page-avatar-img" />
                </div>
              ))}
            </div>
            
            <div className="config-page-avatar-upload-wrapper" style={{ marginTop: '1rem' }}>
              <label className="form-label config-page-avatar-upload-label" style={{ color: 'var(--text-secondary)'}}>Ou envie uma foto personalizada:</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="config-page-avatar-upload-input"
                style={{ color: 'var(--gold)' }}
              />
              <small className="config-page-avatar-upload-hint">
                A imagem será comprimida automaticamente (máx. 50KB WebP).
              </small>
            </div>
          </div>

          {/* SESSÃO LGPD */}
          <div className="card dota-card" style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(233,69,96,0.2)' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)', marginBottom: '0.8rem', fontSize: '1rem' }}>🔒 Privacidade & Notificações (LGPD)</h4>
            <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 0 }}>
              <input 
                type="checkbox" 
                id="whatsappConsent"
                checked={whatsappConsent}
                onChange={e => setWhatsappConsent(e.target.checked)}
                style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--accent)' }}
              />
              <label htmlFor="whatsappConsent" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                Aceito receber lembretes de agendamentos e alertas importantes via WhatsApp.
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, marginTop: '2px' }}>Você pode revogar este consentimento a qualquer momento.</span>
              </label>
            </div>
          </div>

          <hr className="config-page-divider" style={{ borderColor: 'var(--border-gold)', opacity: 0.3, margin: '2rem 0' }} />

          <div className="card-header config-page-pw-header">
            <h3 className="config-page-pw-title" style={{fontFamily: 'var(--font-display)'}}>🔑 Alterar Senha (Opcional)</h3>
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
            <div className="banner error config-page-form-error" style={{marginTop: '1rem'}}>
              {errorMsg}
            </div>
          )}

          <div className="config-page-form-actions" style={{marginTop: '2rem'}}>
            <button type="submit" className="btn btn-primary dota-btn" disabled={loading} style={{width: '100%'}}>
              {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  const renderSystemTab = () => (
    <div className="fade-in-up">
      {error && (
        <div className="config-page-error-alert" style={{marginBottom: '1rem', color: 'var(--accent)'}}>
          ⚠️ {error}
        </div>
      )}
      <div className="grid-2">
        <div className="card dota-card">
          <div className="card-header">
            <h3 style={{fontFamily: 'var(--font-display)', color: 'var(--gold)'}}>🏢 Dados da Empresa</h3>
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
        <div className="card dota-card">
          <div className="card-header">
            <h3 style={{fontFamily: 'var(--font-display)', color: 'var(--gold)'}}>📲 Integrações</h3>
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
          <p className="config-page-admin-security-hint" style={{color: 'var(--text-muted)'}}>
            🔒 As credenciais são armazenadas de forma segura no servidor.
          </p>
        </div>
      </div>

      <div className="card dota-card" style={{marginTop: '1.5rem'}}>
        <div className="card-header">
          <h3 style={{fontFamily: 'var(--font-display)', color: 'var(--gold)'}}>💳 Meios de Pagamento (PDV)</h3>
        </div>
        <div className="form-row" style={{display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem'}}>
          <div className="form-group checkbox-group" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <input type="checkbox" id="aceitaDinheiro" checked={aceitaDinheiro} onChange={e => setAceitaDinheiro(e.target.checked)} style={{width: '1.2rem', height: '1.2rem'}} />
            <label htmlFor="aceitaDinheiro" style={{color: 'var(--text-primary)', margin: 0}}>Aceitar Dinheiro</label>
          </div>
          <div className="form-group checkbox-group" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <input type="checkbox" id="aceitaPix" checked={aceitaPix} onChange={e => setAceitaPix(e.target.checked)} style={{width: '1.2rem', height: '1.2rem'}} />
            <label htmlFor="aceitaPix" style={{color: 'var(--text-primary)', margin: 0}}>Aceitar PIX</label>
          </div>
          <div className="form-group checkbox-group" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <input type="checkbox" id="aceitaCartao" checked={aceitaCartao} onChange={e => setAceitaCartao(e.target.checked)} style={{width: '1.2rem', height: '1.2rem'}} />
            <label htmlFor="aceitaCartao" style={{color: 'var(--text-primary)', margin: 0}}>Aceitar Cartão (Débito/Crédito)</label>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Chave PIX Recebimentos</label>
            <input type="text" className="form-input" value={chavePix} onChange={e => setChavePix(e.target.value)} placeholder="Celular, CNPJ, E-mail ou Chave Aleatória" />
          </div>
          <div className="form-group">
            <label className="form-label">Access Token Mercado Pago</label>
            <input type="password" className="form-input" value={mercadoPagoToken} onChange={e => setMercadoPagoToken(e.target.value)} placeholder="APP_USR-..." />
          </div>
        </div>
      </div>
      <div className="card dota-card config-page-admin-card-mt" style={{marginTop: '1.5rem'}}>
        <div className="card-header">
          <h3 style={{fontFamily: 'var(--font-display)', color: 'var(--gold)'}}>🎮 Gamificação RPG</h3>
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
      <div className="config-page-admin-actions" style={{marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
        <button className="btn btn-secondary dota-btn">RESTAURAR PADRÕES</button>
        <button className="btn btn-primary dota-btn" onClick={salvarAdmin}>💾 SALVAR CONFIGURAÇÕES</button>
      </div>
    </div>
  )

  return (
    <div className="fade-in-up">
      <div className="page-header" style={{ marginBottom: isAdmin ? '1rem' : '2rem' }}>
        <h2 style={{fontFamily: 'var(--font-display)'}}>{isAdmin ? 'Configurações' : 'Minha Conta'}</h2>
        <p>{isAdmin ? 'Painel de controle do sistema e perfil' : 'Gerencie seus dados de acesso e acompanhe sua ficha de RPG'}</p>
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-gold)', paddingBottom: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'perfil' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setActiveTab('perfil')}
            style={{ borderRadius: 0 }}
          >
            MEU PERFIL
          </button>
          <button 
            className={`btn ${activeTab === 'sistema' ? 'btn-primary' : 'btn-ghost'}`} 
            onClick={() => setActiveTab('sistema')}
            style={{ borderRadius: 0 }}
          >
            SISTEMA GERAL
          </button>
        </div>
      )}

      {isAdmin && activeTab === 'sistema' ? renderSystemTab() : renderProfileTab()}

      {toast && <div className="toast">{toastMsg}</div>}
    </div>
  )
}
