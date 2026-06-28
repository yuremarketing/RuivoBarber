import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import AiChatWidget from './components/AiChatWidget.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ClientesPage from './pages/ClientesPage.jsx'
import AgendamentosPage from './pages/AgendamentosPage.jsx'
import ServicosPage from './pages/ServicosPage.jsx'
import CuponsPage from './pages/CuponsPage.jsx'
import NiveisPage from './pages/NiveisPage.jsx'
import ConfiguracoesPage from './pages/ConfiguracoesPage.jsx'
import TemporadasPage from './pages/TemporadasPage.jsx'
import LivesPage from './pages/LivesPage.jsx'
import ClasPage from './pages/ClasPage.jsx'
import AgendaConfigPage from './pages/AgendaConfigPage.jsx'
import CaixaPage from './pages/CaixaPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import HallOfFamePage from './pages/HallOfFamePage.jsx'
import LojaPage from './pages/LojaPage.jsx'


export default function App() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })
  const [previewTheme, setPreviewTheme] = useState(null)

  useEffect(() => {
    const allThemes = ['light', 'royal', 'frostbite', 'forest', 'bloodmoon', 'mystic']
    document.body.classList.remove(...allThemes.map(t => `${t}-theme`))
    
    const activeTheme = previewTheme || theme
    if (activeTheme !== 'dark') {
      document.body.classList.add(`${activeTheme}-theme`)
    }
    localStorage.setItem('theme', theme)
  }, [theme, previewTheme])

  return (
    <div className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {!isLogin && <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        theme={theme}
        onSetTheme={setTheme}
        onPreviewTheme={setPreviewTheme}
      />}
      <main className={isLogin ? 'main-full' : 'main-content'}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/agendamentos" element={<AgendamentosPage />} />
          <Route path="/servicos" element={<ServicosPage />} />
          <Route path="/cupons" element={<CuponsPage />} />
          <Route path="/niveis" element={<NiveisPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/temporadas" element={<TemporadasPage />} />
          <Route path="/lives" element={<LivesPage />} />
          <Route path="/clas" element={<ClasPage />} />
          <Route path="/agenda-config" element={<AgendaConfigPage />} />
          <Route path="/caixa" element={<CaixaPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/hall-of-fame" element={<HallOfFamePage />} />
          <Route path="/loja" element={<LojaPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      <AiChatWidget />
    </div>
  )
}
