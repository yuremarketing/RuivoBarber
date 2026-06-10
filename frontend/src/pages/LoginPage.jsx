import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginService } from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [cargo, setCargo] = useState('Adm')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setErro('')
    
    loginService(login, senha)
      .then(response => {
        const data = response.data
        // Valida se o cargo retornado é o mesmo selecionado pelo usuário
        if (data.user.cargo !== cargo) {
          setErro(`Acesso negado. Seu perfil de acesso real é ${data.user.cargo}.`)
          setLoading(false)
          return
        }

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
      })
      .catch(error => {
        console.error('Erro de autenticação:', error)
        if (error.response && error.response.data && error.response.data.error) {
          setErro(`Credenciais inválidas: ${error.response.data.error}`)
        } else {
          setErro('Erro ao se conectar ao servidor. Certifique-se de que o backend está online.')
        }
        setLoading(false)
      })
  }

  return (
    <div className="login-page">
      <div className="login-card fade-in-up">
        <div className="login-brand">
          <div className="logo">✂️</div>
          <h1>RuivoBarber</h1>
          <p>Sistema de Gestão com Gamificação RPG</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Perfil de Acesso</label>
            <select className="form-input" value={cargo} onChange={e => setCargo(e.target.value)}>
              <option value="Adm">🛡️ Administrador</option>
              <option value="Barbeiro">💈 Barbeiro</option>
              <option value="Cliente">👤 Cliente</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Login</label>
            <input type="text" className="form-input" value={login}
              onChange={e => setLogin(e.target.value)} placeholder="Digite seu login" required />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input type="password" className="form-input" value={senha}
              onChange={e => setSenha(e.target.value)} placeholder="Digite sua senha" required />
          </div>
          {erro && <p style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{erro}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Entrando...' : '🔐 Entrar no Sistema'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Demos: <strong style={{ color: 'var(--text-secondary)' }}>admin/admin</strong> | <strong style={{ color: 'var(--text-secondary)' }}>cliente/cliente</strong>
        </p>
      </div>
    </div>
  )
}
