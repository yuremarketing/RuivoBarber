import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

export default function Sidebar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('ruivobarber_user') || '{"nome":"Administrador","cargo":"Adm"}')
  
  const handleLogout = () => {
    localStorage.removeItem('ruivobarber_user')
    navigate('/login')
  }

  // Definição dinâmica do menu por cargo
  const getMenuItems = () => {
    if (user.cargo === 'Cliente') {
      return [
        { section: 'RPG de Fidelidade' },
        { path: '/dashboard', icon: '⚔️', label: 'Meu RPG' },
        { path: '/cupons', icon: '🎟️', label: 'Meus Cupons' },
        { path: '/temporadas', icon: '⏳', label: 'Temporadas RPG' },
        { path: '/clas', icon: '🛡️', label: 'Clãs & Guildas' },
        { path: '/lives', icon: '📺', label: 'Assista ao Vivo' },
        { path: '/loja', icon: '🎒', label: 'Loja & Inventário' },
        { section: 'Serviços' },
        { path: '/agendamentos', icon: '📅', label: 'Agendar Horário' },
        { path: '/configuracoes', icon: '⚙️', label: 'Minha Conta' },
      ]
    }
    
    if (user.cargo === 'Barbeiro') {
      return [
        { section: 'Atendimentos' },
        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
        { path: '/agendamentos', icon: '📅', label: 'Agendamentos' },
        { path: '/clientes', icon: '👥', label: 'Clientes' },
        { path: '/agenda-config', icon: '⚙️', label: 'Escala & Agenda' },
        { path: '/lives', icon: '📺', label: 'Transmissões ao Vivo' },
      ]
    }

    // Adm por padrão
    return [
      { section: 'Principal' },
      { path: '/dashboard', icon: '📊', label: 'Dashboard' },
      { section: 'Gestão' },
      { path: '/clientes', icon: '👥', label: 'Clientes' },
      { path: '/agendamentos', icon: '📅', label: 'Agendamentos' },
      { path: '/servicos', icon: '✂️', label: 'Serviços' },
      { path: '/cupons', icon: '🎟️', label: 'Cupons' },
      { path: '/agenda-config', icon: '🗓️', label: 'Escalas de Trabalho' },
      { section: 'Sistema' },
      { path: '/niveis', icon: '⚔️', label: 'Níveis RPG' },
      { path: '/temporadas', icon: '⏳', label: 'Temporadas RPG' },
      { path: '/lives', icon: '📺', label: 'Lives & Transmissões' },
      { path: '/configuracoes', icon: '⚙️', label: 'Configurações' },
    ]
  }


  const menuItems = getMenuItems()
  const iniciais = (user.nome || 'AD')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>✂️ RuivoBarber</h1>
        <span>{user.cargo === 'Cliente' ? 'Portal do Cliente' : 'Painel Administrativo'}</span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item, i) =>
          item.section ? (
            <div key={i} className="sidebar-section">{item.section}</div>
          ) : (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          )
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{
            background: user.cargo === 'Cliente' ? 'linear-gradient(135deg, var(--gold), #ffd700)' : 'linear-gradient(135deg, var(--accent), var(--gold))'
          }}>
            {iniciais}
          </div>
          <div className="sidebar-user-info">
            <div className="name" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
              {user.nome}
            </div>
            <div className="role">{user.cargo === 'Cliente' ? `Nível: ${user.nivel || 'Cliente'}` : user.cargo}</div>
          </div>
          <button className="btn-ghost" onClick={handleLogout} title="Sair">🚪</button>
        </div>
      </div>
    </aside>
  )
}
