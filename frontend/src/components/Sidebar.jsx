import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const menuItems = [
  { section: 'Principal' },
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { section: 'Gestão' },
  { path: '/clientes', icon: '👥', label: 'Clientes' },
  { path: '/agendamentos', icon: '📅', label: 'Agendamentos' },
  { path: '/servicos', icon: '✂️', label: 'Serviços' },
  { path: '/cupons', icon: '🎟️', label: 'Cupons' },
  { section: 'Sistema' },
  { path: '/niveis', icon: '⚔️', label: 'Níveis RPG' },
  { path: '/configuracoes', icon: '⚙️', label: 'Configurações' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>✂️ RuivoBarber</h1>
        <span>Painel Administrativo</span>
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
          <div className="sidebar-avatar">AD</div>
          <div className="sidebar-user-info">
            <div className="name">Administrador</div>
            <div className="role">Admin</div>
          </div>
          <button className="btn-ghost" onClick={() => navigate('/login')} title="Sair">🚪</button>
        </div>
      </div>
    </aside>
  )
}
