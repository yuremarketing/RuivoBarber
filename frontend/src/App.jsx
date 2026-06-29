import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import AiChatWidget from './components/AiChatWidget.jsx'
const LoginPage = React.lazy(() => import('./pages/LoginPage.jsx'))
const DashboardPage = React.lazy(() => import('./pages/DashboardPage.jsx'))
const ClientesPage = React.lazy(() => import('./pages/ClientesPage.jsx'))
const AgendamentosPage = React.lazy(() => import('./pages/AgendamentosPage.jsx'))
const ServicosPage = React.lazy(() => import('./pages/ServicosPage.jsx'))
const CuponsPage = React.lazy(() => import('./pages/CuponsPage.jsx'))
const NiveisPage = React.lazy(() => import('./pages/NiveisPage.jsx'))
const ConfiguracoesPage = React.lazy(() => import('./pages/ConfiguracoesPage.jsx'))
const TemporadasPage = React.lazy(() => import('./pages/TemporadasPage.jsx'))
const LivesPage = React.lazy(() => import('./pages/LivesPage.jsx'))
const ClasPage = React.lazy(() => import('./pages/ClasPage.jsx'))
const AgendaConfigPage = React.lazy(() => import('./pages/AgendaConfigPage.jsx'))
const CaixaPage = React.lazy(() => import('./pages/CaixaPage.jsx'))
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage.jsx'))
const HallOfFamePage = React.lazy(() => import('./pages/HallOfFamePage.jsx'))
const LojaPage = React.lazy(() => import('./pages/LojaPage.jsx'))


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
        <React.Suspense fallback={<div className="skeleton-card skeleton-pulse" style={{ height: '100%', minHeight: '50vh', margin: '2rem' }}></div>}>
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
        </React.Suspense>
      </main>
      <AiChatWidget />
    </div>
  )
}
