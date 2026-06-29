import React from 'react'
import PropTypes from 'prop-types'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0d13',
          fontFamily: "'Cinzel', 'Inter', sans-serif",
          color: '#f0f0f5',
          padding: '2rem'
        }}>
          <div style={{
            background: 'rgba(22, 26, 36, 0.95)',
            border: '2px solid #a38c5d',
            borderRadius: '12px',
            padding: '3rem 2rem',
            maxWidth: '550px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(191, 42, 42, 0.25), inset 0 0 15px rgba(212, 178, 111, 0.1)'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              color: '#bf2a2a',
              textShadow: '0 0 10px rgba(191, 42, 42, 0.5)'
            }}>
              
            </div>
            
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              color: '#d4b26f',
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Falha na Batalha
            </h2>
            
            <p style={{
              color: '#8f98a5',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              marginBottom: '2rem',
              fontFamily: "'Inter', sans-serif"
            }}>
              Ocorreu um erro inesperado nesta interface. Os magos do RuivoBarber já foram notificados para restaurar a ordem.
            </p>

            {this.state.error && (
              <div style={{
                background: '#090c12',
                border: '1px solid #2b3240',
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '2rem',
                textAlign: 'left',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: '#bf2a2a',
                overflowX: 'auto',
                maxHeight: '150px'
              }}>
                <strong>Erro:</strong> {this.state.error.toString()}
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button 
                onClick={this.handleReset}
                style={{
                  background: 'linear-gradient(135deg, #bf2a2a, #d93636)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.8rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(191, 42, 42, 0.4)',
                  transition: 'transform 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                Voltar ao Painel
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                style={{
                  background: '#161a24',
                  color: '#d4b26f',
                  border: '1px solid #a38c5d',
                  borderRadius: '6px',
                  padding: '0.8rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(212, 178, 111, 0.08)'}
                onMouseOut={(e) => e.currentTarget.style.background = '#161a24'}
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired
}

