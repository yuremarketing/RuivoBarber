import React from 'react'
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


export default function App() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  return (
    <div className="app">
      {!isLogin && <Sidebar />}
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
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      <AiChatWidget />
    </div>
  )
}
