import React, { useState, useEffect } from 'react'

export default function LgpdGatekeeper({ children }) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const userStr = localStorage.getItem('ruivobarber_user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        // If lgpdAceito is false or undefined, show modal
        if (!user.lgpdAceito) {
          setShowModal(true)
        }
      } catch (e) {
        console.error('Error parsing user for LGPD', e)
      }
    }
  }, [])

  const handleAceitar = async () => {
    setLoading(true)
    setError('')
    try {
      const userStr = localStorage.getItem('ruivobarber_user')
      const user = JSON.parse(userStr)
      const token = localStorage.getItem('ruivobarber_token')

      const res = await fetch('/api/usuarios/aceitar-lgpd', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Falha ao registrar aceite. Tente novamente.')
      }

      // Update local storage
      user.lgpdAceito = true
      localStorage.setItem('ruivobarber_user', JSON.stringify(user))
      setShowModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (showModal) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h2 style={styles.title}>🔒 Atualização de Segurança e Privacidade</h2>
          <p style={styles.text}>
            Para continuarmos protegendo seus dados e estarmos em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>, precisamos do seu consentimento.
          </p>
          <ul style={styles.list}>
            <li>Seus dados sensíveis, como o telefone, agora são <strong>criptografados de ponta-a-ponta</strong> no nosso banco de dados (AES-256).</li>
            <li>O acesso ao seu número por administradores e barbeiros gerará um <strong>log de auditoria rastreável</strong>, prevenindo qualquer abuso.</li>
            <li>Você passa a ter o <strong>Direito ao Esquecimento</strong>, podendo excluir sua conta e anonimizar seus dados permanentemente nas Configurações.</li>
          </ul>
          <p style={styles.text}>
            Ao clicar em "Aceitar e Continuar", você concorda com nossos novos Termos de Uso e Política de Privacidade.
          </p>
          
          {error && <div style={styles.error}>{error}</div>}

          <button 
            style={{...styles.btn, opacity: loading ? 0.7 : 1}} 
            onClick={handleAceitar} 
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Aceitar e Continuar'}
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999
  },
  modal: {
    backgroundColor: '#1E1E2E',
    padding: '2rem',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    color: '#fff',
    border: '1px solid #333'
  },
  title: {
    marginTop: 0,
    color: '#E0A800',
    fontSize: '1.5rem',
    marginBottom: '1rem'
  },
  text: {
    lineHeight: 1.6,
    color: '#ccc',
    marginBottom: '1rem'
  },
  list: {
    lineHeight: 1.6,
    color: '#ccc',
    marginBottom: '1.5rem',
    paddingLeft: '1.2rem'
  },
  btn: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#E0A800',
    color: '#111',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  error: {
    color: '#FF6B6B',
    marginBottom: '1rem',
    textAlign: 'center',
    padding: '0.5rem',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: '6px'
  }
}
