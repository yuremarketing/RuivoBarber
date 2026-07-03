import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import AiChatWidget from './components/AiChatWidget.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
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
const AgendaBarbeiroPage = React.lazy(() => import('./pages/AgendaBarbeiroPage.jsx'))
const RelatoriosPage = React.lazy(() => import('./pages/RelatoriosPage.jsx'))
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
      <div className="dota-noise-overlay"></div>
      <div className="dota-vignette"></div>
      {!isLogin && <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        theme={theme}
        onSetTheme={setTheme}
        onPreviewTheme={setPreviewTheme}
      />}
      <main className={isLogin ? 'main-full' : 'main-content'}>
        <ErrorBoundary>
          <React.Suspense fallback={<div className="skeleton-card skeleton-pulse" style={{ height: '100%', minHeight: '50vh', margin: '2rem' }}></div>}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute allowedRoles={['Adm', 'Barbeiro']}><ClientesPage /></ProtectedRoute>} />
              <Route path="/agendamentos" element={<ProtectedRoute><AgendamentosPage /></ProtectedRoute>} />
              <Route path="/servicos" element={<ProtectedRoute allowedRoles={['Adm']}><ServicosPage /></ProtectedRoute>} />
              <Route path="/cupons" element={<ProtectedRoute allowedRoles={['Adm']}><CuponsPage /></ProtectedRoute>} />
              <Route path="/niveis" element={<ProtectedRoute allowedRoles={['Adm']}><NiveisPage /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute allowedRoles={['Adm']}><ConfiguracoesPage /></ProtectedRoute>} />
              <Route path="/temporadas" element={<ProtectedRoute allowedRoles={['Adm']}><TemporadasPage /></ProtectedRoute>} />
              <Route path="/lives" element={<ProtectedRoute allowedRoles={['Adm', 'Barbeiro']}><LivesPage /></ProtectedRoute>} />
              <Route path="/clas" element={<ProtectedRoute><ClasPage /></ProtectedRoute>} />
              <Route path="/agenda-config" element={<ProtectedRoute allowedRoles={['Adm', 'Barbeiro']}><AgendaConfigPage /></ProtectedRoute>} />
              <Route path="/agenda-barbeiro" element={<ProtectedRoute><AgendaBarbeiroPage /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute allowedRoles={['Adm', 'Barbeiro']}><RelatoriosPage /></ProtectedRoute>} />
              <Route path="/caixa" element={<ProtectedRoute allowedRoles={['Adm']}><CaixaPage /></ProtectedRoute>} />
              <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
              <Route path="/hall-of-fame" element={<ProtectedRoute><HallOfFamePage /></ProtectedRoute>} />
              <Route path="/loja" element={<ProtectedRoute><LojaPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </React.Suspense>
        </ErrorBoundary>
      </main>
      <AiChatWidget />
    </div>
  )
}
