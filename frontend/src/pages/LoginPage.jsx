import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginService, registrarPublico, loginComGoogle } from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [isRegistering, setIsRegistering] = useState(false)
  
  // Login fields
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [cargo, setCargo] = useState('Cliente') // default para cliente
  
  // Register fields
  const [regNome, setRegNome] = useState('')
  const [regLogin, setRegLogin] = useState('')
  const [regSenha, setRegSenha] = useState('')

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Efeito para configurar o Google Sign-In
  useEffect(() => {
    // Carregar SDK oficial do Google
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    window.handleCredentialResponse = (response) => {
      setLoading(true)
      setErro('')
      loginComGoogle(response.credential)
        .then(res => {
          const data = res.data
          saveSessionAndNavigate(data)
        })
        .catch(err => {
          console.error(err)
          setErro('Erro no login do Google: ' + (err.response?.data?.error || err.message))
          setLoading(false)
        })
    }

    return () => {
      try {
        document.body.removeChild(script)
      } catch (e) {}
    }
  }, [])

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

    setLoading(true)
    setErro('')
    setSucesso('')

    registrarPublico(regNome, regLogin, regSenha)
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

  return (
    <div className="login-page">
      <div className="login-card fade-in-up">
        <div className="login-brand">
          <div className="logo" style={{ fontSize: '3rem', textShadow: '0 0 10px rgba(233,69,96,0.5)' }}>✂️</div>
          <h1 style={{ background: 'linear-gradient(90deg, #e94560, #f5a623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>RuivoBarber</h1>
          <p>Sistema de Gestão com Gamificação RPG</p>
        </div>

        {/* Alternar Abas */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
          <button 
            type="button" 
            onClick={() => { setIsRegistering(false); setErro(''); setSucesso(''); }}
            style={{
              flex: 1,
              padding: '0.8rem',
              background: 'none',
              border: 'none',
              color: !isRegistering ? '#fff' : 'var(--text-muted)',
              borderBottom: !isRegistering ? '2px solid #e94560' : 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}
          >
            Entrar
          </button>
          <button 
            type="button" 
            onClick={() => { setIsRegistering(true); setErro(''); setSucesso(''); }}
            style={{
              flex: 1,
              padding: '0.8rem',
              background: 'none',
              border: 'none',
              color: isRegistering ? '#fff' : 'var(--text-muted)',
              borderBottom: isRegistering ? '2px solid #e94560' : 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem'
            }}
          >
            Criar Conta
          </button>
        </div>

        {erro && <div className="banner error" style={{ padding: '0.8rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{erro}</div>}
        {sucesso && <div className="banner success" style={{ padding: '0.8rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#4caf50' }}>{sucesso}</div>}

        {!isRegistering ? (
          /* Formulário de Login */
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Perfil de Acesso</label>
              <select className="form-input" value={cargo} onChange={e => setCargo(e.target.value)}>
                <option value="Cliente">👤 Cliente</option>
                <option value="Barbeiro">💈 Barbeiro</option>
                <option value="Adm">🛡️ Administrador</option>
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }} disabled={loading}>
              {loading ? '⏳ Entrando...' : '🔐 Entrar no Sistema'}
            </button>
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
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }} disabled={loading}>
              {loading ? '⏳ Cadastrando...' : '🚀 Criar Minha Conta'}
            </button>
          </form>
        )}

        {/* Divisor Social */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ padding: '0 0.8rem' }}>ou continue com</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Container do Google One Tap / Sign In */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <div 
            id="g_id_onload"
            data-client_id="875304695392-ps6bpdh818gs2dirgd7eqea3omvrggdb.apps.googleusercontent.com" // ID de cliente do Google real configurado
            data-context="signin"
            data-ux_mode="popup"
            data-callback="handleCredentialResponse"
            data-auto_select="false"
          />
          
          {/* Botão de login oficial do Google */}
          <div 
            className="g_id_signin"
            data-type="standard"
            data-shape="rectangular"
            data-theme="filled_blue"
            data-text="signin_with"
            data-size="large"
            data-logo_alignment="left"
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          />
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Demos: <strong style={{ color: 'var(--text-secondary)' }}>admin/admin</strong> | <strong style={{ color: 'var(--text-secondary)' }}>cliente/cliente</strong>
        </p>
      </div>
    </div>
  )
}
