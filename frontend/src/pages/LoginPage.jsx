import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginService, registrarPublico, loginComGoogle } from '../services/api'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'

export default function LoginPage() {
  const navigate = useNavigate()
  const [isRegistering, setIsRegistering] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [showTestButton, setShowTestButton] = useState(false)
  
  // Login fields
  const [login, setLogin] = useState('')
  
  useEffect(() => {
    const userSessionStr = localStorage.getItem('ruivobarber_user')
    if (userSessionStr) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])
  const [senha, setSenha] = useState('')
  const [cargo, setCargo] = useState('Cliente') // default para cliente
  
  // Register fields
  const [regNome, setRegNome] = useState('')
  const [regLogin, setRegLogin] = useState('')
  const [regSenha, setRegSenha] = useState('')
  const [regWhatsappConsent, setRegWhatsappConsent] = useState(false)

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const cargoRef = React.useRef(cargo)
  useEffect(() => {
    cargoRef.current = cargo
  }, [cargo])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (
      isLocalhost ||
      params.get('dev') === 'true' || 
      params.get('test') === 'true' || 
      params.get('japa') === 'true' ||
      params.get('admin') === 'true'
    ) {
      setShowTestButton(true)
    }
  }, [])

  // Botão customizado via useGoogleLogin — funciona no Firefox, Safari e todos os navegadores
  // pois abre um popup direto em vez de um iframe bloqueável pelos sistemas de anti-rastreamento.
  const handleGoogleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      if (cargoRef.current !== 'Cliente') {
        setErro('Login social do Google permitido apenas para clientes.')
        return
      }
      setLoading(true)
      setErro('')
      loginComGoogle(codeResponse.code)
        .then(res => {
          saveSessionAndNavigate(res.data)
        })
        .catch(err => {
          console.error(err)
          setErro('Erro no login do Google: ' + (err.response?.data?.error || err.message))
          setLoading(false)
        })
    },
    onError: (err) => {
      console.error(err)
      setErro('Falha na autenticação com o Google. Tente novamente.')
    },
  })

  const saveSessionAndNavigate = (data) => {
    const userSession = {
      id: data.user.id,
      nome: data.user.nome,
      cargo: data.user.cargo,
      login: data.user.login,
      xp: data.user.xp,
      nivel: data.user.nivel,
      token: data.token
    }
    localStorage.setItem('ruivobarber_user', JSON.stringify(userSession))
    navigate('/dashboard')
  }

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setSucesso('')
    
    loginService(login, senha)
      .then(response => {
        const data = response.data
        if (data.user.cargo !== cargo) {
          setErro(`Acesso negado. Seu perfil de acesso real é ${data.user.cargo}.`)
          setLoading(false)
          return
        }
        saveSessionAndNavigate(data)
      })
      .catch(error => {
        console.error('Erro de autenticação:', error)
        if (error.response && error.response.data && error.response.data.error) {
          setErro(`Erro: ${error.response.data.error}`)
        } else {
          setErro('Erro ao se conectar ao servidor. Certifique-se de que o backend está online.')
        }
        setLoading(false)
      })
  }

  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    if (!regNome || !regLogin || !regSenha) {
      setErro('Por favor, preencha todos os campos.')
      return
    }
    
    if (!regWhatsappConsent) {
      setErro('Você precisa consentir com os termos para continuar.')
      return
    }

    setLoading(true)
    setErro('')
    setSucesso('')

    registrarPublico(regNome, regLogin, regSenha, regWhatsappConsent)
      .then(response => {
        const data = response.data
        setSucesso('Conta criada com sucesso! Redirecionando para o painel...')
        setTimeout(() => {
          saveSessionAndNavigate(data)
        }, 1500)
      })
      .catch(error => {
        console.error('Erro ao registrar:', error)
        if (error.response && error.response.data && error.response.data.error) {
          setErro(`Erro no cadastro: ${error.response.data.error}`)
        } else {
          setErro('Erro ao se conectar ao servidor.')
        }
        setLoading(false)
      })
  }

  const handleGoogleMock = () => {
    setLoading(true)
    setErro('')
    setSucesso('')
    const mockEmail = `mock_google_${regLogin || login || 'usuario_google'}@gmail.com`
    loginComGoogle(mockEmail)
      .then(res => {
        const data = res.data
        setSucesso('Login do Google simulado com sucesso!')
        setTimeout(() => {
          saveSessionAndNavigate(data)
        }, 800)
      })
      .catch(err => {
        setErro('Erro no login simulado: ' + (err.response?.data?.error || err.message))
        setLoading(false)
      })
  }

  const handleTestLogin = () => {
    setLoading(true)
    setErro('')
    setSucesso('Modo de Teste: Autenticando com dados simulados...')
    
    let mockUser = {
      id: 999,
      nome: `Demo ${cargo}`,
      cargo: cargo,
      login: cargo.toLowerCase() + '_ruivo',
      xp: 450,
      nivel: 'Barba de Respeito'
    }
    
    if (cargo === 'Cliente') {
      mockUser.id = 999
      mockUser.nome = 'Cliente Fictício'
      mockUser.login = 'cliente_ruivo'
      mockUser.xp = 120
      mockUser.nivel = 'Corte Iniciante'
    } else if (cargo === 'Barbeiro') {
      mockUser.id = 998
      mockUser.nome = 'Barbeiro Fictício'
      mockUser.login = 'barbeiro_ruivo'
      mockUser.xp = 0
      mockUser.nivel = '-'
    } else {
      mockUser.id = 997
      mockUser.nome = 'Administrador Fictício'
      mockUser.login = 'admin_ruivo'
      mockUser.xp = 999
      mockUser.nivel = 'Rei da Cadeira'
    }

    const mockData = {
      user: mockUser,
      token: `mocked_jwt_token_for_testing:${mockUser.id}:${mockUser.cargo}:${encodeURIComponent(mockUser.nome)}`
    }

    setTimeout(() => {
      saveSessionAndNavigate(mockData)
    }, 1000)
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'COLE_SEU_CLIENT_ID_AQUI.apps.googleusercontent.com'

  return (
    <GoogleOAuthProvider clientId={clientId}>
    <div className="login-page">
      {/* ── Dota 2 Particles ─── */}
      {Array.from({ length: 15 }).map((_, i) => (
        <div 
          key={i} 
          className="particle forge-glow"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `-20px`,
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            animation: `embers ${Math.random() * 3 + 2}s infinite ${Math.random() * 2}s`
          }}
        />
      ))}
      <div className="login-card dota-card fade-in-up">
        <div className="login-brand">
          <div className="logo login-page-logo-container forge-glow"></div>
          <h1 className="login-page-title" style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', textShadow: '0 0 15px var(--accent)' }}>RuivoBarber</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sistema de Gestão com Gamificação RPG</p>
        </div>

        {/* Alternar Abas */}
        <div className="login-page-tabs">
          <button 
            type="button" 
            onClick={() => { setIsRegistering(false); setErro(''); setSucesso(''); }}
            className={`login-page-tab-btn ${!isRegistering ? 'login-page-tab-btn--active' : 'login-page-tab-btn--inactive'}`}
          >
            Entrar
          </button>
          <button 
            type="button" 
            onClick={() => { setIsRegistering(true); setErro(''); setSucesso(''); }}
            className={`login-page-tab-btn ${isRegistering ? 'login-page-tab-btn--active' : 'login-page-tab-btn--inactive'}`}
          >
            Criar Conta
          </button>
        </div>

        {erro && <div className="banner error login-page-alert-error">{erro}</div>}
        {sucesso && <div className="banner success login-page-alert-success">{sucesso}</div>}

        {!isRegistering ? (
          /* Formulário de Login */
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Perfil de Acesso</label>
              <select className="form-input" value={cargo} onChange={e => setCargo(e.target.value)}>
                <option value="Cliente">👤 Cliente</option>
                <option value="Barbeiro">💈 Barbeiro</option>
                <option value="Adm">Administrador</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Login</label>
              <input 
                type="text" 
                className="form-input" 
                value={login}
                onChange={e => setLogin(e.target.value)} 
                placeholder="Digite seu login" 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input 
                type="password" 
                className="form-input" 
                value={senha}
                onChange={e => setSenha(e.target.value)} 
                placeholder="Digite sua senha" 
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary login-page-submit-btn" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
            </button>
            {showTestButton && (
              <button 
                type="button" 
                onClick={handleTestLogin}
                className="login-page-test-btn"
              >
                ⚡ ENTRAR MODO TESTE (MOCK)
              </button>
            )}
          </form>
        ) : (
          /* Formulário de Cadastro */
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <input 
                type="text" 
                className="form-input" 
                value={regNome}
                onChange={e => setRegNome(e.target.value)} 
                placeholder="Digite seu nome completo" 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Login (Nome de usuário)</label>
              <input 
                type="text" 
                className="form-input" 
                value={regLogin}
                onChange={e => setRegLogin(e.target.value)} 
                placeholder="Digite o login desejado" 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input 
                type="password" 
                className="form-input" 
                value={regSenha}
                onChange={e => setRegSenha(e.target.value)} 
                placeholder="Crie uma senha segura" 
                required 
              />
            </div>
            
            <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '10px', marginBottom: '20px' }}>
              <input 
                type="checkbox" 
                id="whatsappConsent"
                checked={regWhatsappConsent}
                onChange={e => setRegWhatsappConsent(e.target.checked)}
                style={{ marginTop: '4px' }}
              />
              <label htmlFor="whatsappConsent" style={{ fontSize: '0.85rem', color: '#ccc', lineHeight: '1.4' }}>
                Aceito receber notificações essenciais sobre meus agendamentos e promoções exclusivas via WhatsApp. 
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>(Em conformidade com a LGPD, você poderá revogar este consentimento a qualquer momento.)</span>
              </label>
            </div>
            <button type="submit" className="btn btn-primary login-page-submit-btn" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Criar Minha Conta'}
            </button>
          </form>
        )}

        {/* Divisor Social (oculto para administradores e barbeiros via CSS display) */}
        <div className={`login-page-social-divider ${cargo === 'Cliente' ? 'login-page-social-divider--visible' : 'login-page-social-divider--hidden'}`}>
          <div className="login-page-social-line" />
          <span className="login-page-social-text">ou continue com</span>
          <div className="login-page-social-line" />
        </div>

        {/* Botão customizado do Google — funciona no Firefox, Chrome, Safari e outros navegadores */}
        {cargo === 'Cliente' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center', width: '100%' }}>
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.72rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                letterSpacing: '0.02em',
                transition: 'background 0.2s, border-color 0.2s',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
            >
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0491 13.5614L14.9577 15.8195C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                <path d="M9 18C11.43 18 13.4673 17.1941 14.9577 15.8195L12.0491 13.5614C11.2418 14.1027 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
              </svg>
              Entrar com o Google
            </button>

            {devMode && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '0.25rem 0', color: '#e94560', fontSize: '0.72rem', fontWeight: 600, opacity: 0.6 }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(233,69,96,0.3)', marginRight: '0.5rem' }} />
                  <span>MODO DESENVOLVEDOR</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(233,69,96,0.3)', marginLeft: '0.5rem' }} />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleMock}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.8rem',
                    padding: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(233,69,96,0.3)',
                    background: 'rgba(233,69,96,0.05)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(233,69,96,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(233,69,96,0.05)'}
                >
                  Google (Mock / Simulado)
                </button>
              </>
            )}
          </div>
        )}

        <div className="login-page-dev-section">
          {devMode ? (
            <>
              <p className="login-page-dev-hint">
                Demos: <strong className="login-page-dev-hint-strong">admin/admin</strong> | <strong className="login-page-dev-hint-strong">cliente/cliente</strong>
              </p>
              <button 
                type="button" 
                onClick={() => setDevMode(false)}
                className="login-page-dev-btn"
              >
                Voltar para o Modo Produção 🔒
              </button>
            </>
          ) : (
            <button 
              type="button" 
              onClick={() => setDevMode(true)}
              className="login-page-dev-toggle"
            >
              🛠️ Modo de Desenvolvimento
            </button>
          )}
        </div>
      </div>
    </div>
    </GoogleOAuthProvider>
  )
}
