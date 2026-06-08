import React, { useState } from 'react'

export default function ConfiguracoesPage() {
  const [whatsappKey, setWhatsappKey] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [nomeEmpresa, setNomeEmpresa] = useState('RuivoBarber')
  const [toast, setToast] = useState(false)

  const salvar = () => {
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <h2>⚙️ Configurações</h2>
        <p>Configurações gerais do sistema</p>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>🏢 Dados da Empresa</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Nome da Empresa</label>
            <input type="text" className="form-input" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Endereço</label>
            <input type="text" className="form-input" placeholder="Rua, número, bairro" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input type="tel" className="form-input" placeholder="(11) 99999-9999" />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input type="email" className="form-input" placeholder="contato@ruivobarber.com" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>📲 Integrações</h3>
          </div>
          <div className="form-group">
            <label className="form-label">Chave API WhatsApp</label>
            <input type="password" className="form-input" value={whatsappKey} onChange={e => setWhatsappKey(e.target.value)} placeholder="Insira a chave da API" />
          </div>
          <div className="form-group">
            <label className="form-label">URL do Webhook</label>
            <input type="url" className="form-input" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://webhook.example.com" />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            🔒 As credenciais são armazenadas de forma segura no servidor.
          </p>
        </div>
      </div>
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h3>🎮 Gamificação RPG</h3>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">XP Base por Serviço</label>
            <input type="number" className="form-input" defaultValue="10" />
          </div>
          <div className="form-group">
            <label className="form-label">Multiplicador de XP</label>
            <select className="form-input">
              <option>1.0x (Normal)</option>
              <option>1.5x (Evento Especial)</option>
              <option>2.0x (Evento Duplo XP)</option>
            </select>
          </div>
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button className="btn btn-secondary">Restaurar Padrões</button>
        <button className="btn btn-primary" onClick={salvar}>💾 Salvar Configurações</button>
      </div>
      {toast && <div className="toast">✅ Configurações salvas com sucesso!</div>}
    </div>
  )
}
