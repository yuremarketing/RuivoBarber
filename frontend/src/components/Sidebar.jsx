import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { NavLink, useNavigate } from 'react-router-dom'
import { 
  Swords, Ticket, Hourglass, Shield, Tv, Backpack, Trophy, 
  Calendar, Settings, LayoutDashboard, Users, Banknote, ShoppingCart, 
  Scissors, CalendarDays, ChevronLeft, ChevronRight, LogOut, Palette, PieChart, Activity
} from 'lucide-react'

export default function Sidebar({ collapsed, onToggle, theme, onSetTheme, onPreviewTheme }) {
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState(null)

  const handleMouseEnter = (t) => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    const timeout = setTimeout(() => {
      if (onPreviewTheme) onPreviewTheme(t)
    }, 500)
    setHoverTimeout(timeout)
  }

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    if (onPreviewTheme) onPreviewTheme(null)
  }
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
        { section: 'Barbearia' },
        { path: '/agendamentos', icon: <Calendar size={20} strokeWidth={1.5} />, label: 'Agendar Horário' },
        { path: '/lives', icon: <Tv size={20} strokeWidth={1.5} />, label: 'Assista ao Vivo' },
        
        { section: 'Progresso RPG' },
        { path: '/dashboard', icon: <Swords size={20} strokeWidth={1.5} />, label: 'Meu Personagem' },
        { path: '/cupons', icon: <Ticket size={20} strokeWidth={1.5} />, label: 'Meus Cupons' },
        { path: '/loja', icon: <Backpack size={20} strokeWidth={1.5} />, label: 'Loja & Inventário' },
        
        { section: 'Ranking & Comunidade' },
        { path: '/temporadas', icon: <Hourglass size={20} strokeWidth={1.5} />, label: 'Temporadas' },
        { path: '/clas', icon: <Shield size={20} strokeWidth={1.5} />, label: 'Clãs & Guildas' },
        { path: '/hall-of-fame', icon: <Trophy size={20} strokeWidth={1.5} />, label: 'Hall of Fame' },
      ]
    }
    
    if (user.cargo === 'Barbeiro') {
      return [
        { section: 'Atendimentos' },
        { path: '/dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, label: 'Painel Geral' },
        { path: '/agenda-barbeiro', icon: <Calendar size={20} strokeWidth={1.5} />, label: 'Minha Agenda' },
        { path: '/clientes', icon: <Users size={20} strokeWidth={1.5} />, label: 'Clientes' },
        
        { section: 'PDV & Finanças' },
        { path: '/checkout', icon: <ShoppingCart size={20} strokeWidth={1.5} />, label: 'Vender (PDV)' },
        { path: '/caixa', icon: <Banknote size={20} strokeWidth={1.5} />, label: 'Meu Caixa' },
        
        { section: 'Sistema & Engajamento' },
        { path: '/lives', icon: <Tv size={20} strokeWidth={1.5} />, label: 'Transmissões' },
        { path: '/hall-of-fame', icon: <Trophy size={20} strokeWidth={1.5} />, label: 'Hall of Fame' },
        { path: '/agenda-config', icon: <Settings size={20} strokeWidth={1.5} />, label: 'Configurar Escala' },
      ]
    }

    // Adm por padrão
    return [
      { section: 'Visão Geral' },
      { path: '/dashboard', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, label: 'Dashboard' },
      
      { section: 'Operacional' },
      { path: '/agendamentos', icon: <Calendar size={20} strokeWidth={1.5} />, label: 'Agendamentos' },
      { path: '/clientes', icon: <Users size={20} strokeWidth={1.5} />, label: 'Clientes' },
      { path: '/servicos', icon: <Scissors size={20} strokeWidth={1.5} />, label: 'Serviços' },
      { path: '/agenda-config', icon: <CalendarDays size={20} strokeWidth={1.5} />, label: 'Escalas & Horários' },
      
      { section: 'PDV & Finanças' },
      { path: '/checkout', icon: <ShoppingCart size={20} strokeWidth={1.5} />, label: 'PDV' },
      { path: '/caixa', icon: <Banknote size={20} strokeWidth={1.5} />, label: 'Caixas' },
      { path: '/relatorios', icon: <PieChart size={20} strokeWidth={1.5} />, label: 'Relatórios' },
      
      { section: 'RPG & Engajamento' },
      { path: '/niveis', icon: <Swords size={20} strokeWidth={1.5} />, label: 'Gerenciar Níveis' },
      { path: '/temporadas', icon: <Hourglass size={20} strokeWidth={1.5} />, label: 'Temporadas' },
      { path: '/cupons', icon: <Ticket size={20} strokeWidth={1.5} />, label: 'Cupons de Recompensa' },
      { path: '/hall-of-fame', icon: <Trophy size={20} strokeWidth={1.5} />, label: 'Hall of Fame' },
      
      { section: 'Mídia & Sistema' },
      { path: '/lives', icon: <Tv size={20} strokeWidth={1.5} />, label: 'Lives & Transmissões' },
      { path: '/operacoes', icon: <Activity size={20} strokeWidth={1.5} />, label: 'Saúde & Operações' },
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
        <h1>RuivoBarber</h1>
        <span>{user.cargo === 'Cliente' ? 'Portal do Cliente' : 'Painel Administrativo'}</span>
        
        {/* Toggle Button */}
        <button className="sidebar-toggle-btn" onClick={onToggle} title={collapsed ? "Expandir" : "Recolher"}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item, i) =>
          item.section ? (
            <div key={i} className="sidebar-section">{item.section}</div>
          ) : (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}>
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
            </NavLink>
          )
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div 
            className="sidebar-user-profile" 
            onClick={() => navigate('/configuracoes')}
            title="Minha Conta"
          >
            <div className={`sidebar-avatar ${user.cargo === 'Cliente' ? 'avatar-client' : 'avatar-staff'}`}>
              {iniciais}
            </div>
            <div className="sidebar-user-info">
              <div className="name">
                {user.nome}
              </div>
              <div className="role">{user.cargo === 'Cliente' ? `Nível: ${user.nivel || 'Cliente'}` : user.cargo}</div>
            </div>
          </div>
          <div style={{ position: 'relative', display: 'flex', gap: '0.25rem' }}>
            {showThemeMenu && (
              <div className="theme-popover" onMouseLeave={handleMouseLeave}>
                <button onMouseEnter={() => handleMouseEnter('dark')} onClick={() => { onSetTheme('dark'); setShowThemeMenu(false) }} className={`theme-swatch dark ${theme === 'dark' ? 'active' : ''}`} title="Dark Mode" />
                <button onMouseEnter={() => handleMouseEnter('light')} onClick={() => { onSetTheme('light'); setShowThemeMenu(false) }} className={`theme-swatch light ${theme === 'light' ? 'active' : ''}`} title="Light Mode" />
                <button onMouseEnter={() => handleMouseEnter('royal')} onClick={() => { onSetTheme('royal'); setShowThemeMenu(false) }} className={`theme-swatch royal ${theme === 'royal' ? 'active' : ''}`} title="Royal Prestige" />
                <button onMouseEnter={() => handleMouseEnter('frostbite')} onClick={() => { onSetTheme('frostbite'); setShowThemeMenu(false) }} className={`theme-swatch frostbite ${theme === 'frostbite' ? 'active' : ''}`} title="Frostbite" />
                <button onMouseEnter={() => handleMouseEnter('forest')} onClick={() => { onSetTheme('forest'); setShowThemeMenu(false) }} className={`theme-swatch forest ${theme === 'forest' ? 'active' : ''}`} title="Radiant Forest" />
                <button onMouseEnter={() => handleMouseEnter('bloodmoon')} onClick={() => { onSetTheme('bloodmoon'); setShowThemeMenu(false) }} className={`theme-swatch bloodmoon ${theme === 'bloodmoon' ? 'active' : ''}`} title="Blood Moon" />
                <button onMouseEnter={() => handleMouseEnter('mystic')} onClick={() => { onSetTheme('mystic'); setShowThemeMenu(false) }} className={`theme-swatch mystic ${theme === 'mystic' ? 'active' : ''}`} title="Mystic Faerie (Feminino)" />
              </div>
            )}
            <button className="btn-ghost" onClick={() => setShowThemeMenu(!showThemeMenu)} title="Trocar Tema">
              <Palette size={20} strokeWidth={1.5} />
            </button>
            <button className="btn-ghost" onClick={handleLogout} title="Sair">
              <LogOut size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

Sidebar.propTypes = {
  collapsed: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  theme: PropTypes.string,
  onSetTheme: PropTypes.func,
  onPreviewTheme: PropTypes.func
}

