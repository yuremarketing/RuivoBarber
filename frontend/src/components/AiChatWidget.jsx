import React, { useState, useEffect, useRef } from 'react'
import { streamChat } from '../services/api.js'

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  
  const chatEndRef = useRef(null)

  const userSessionStr = localStorage.getItem('ruivobarber_user')
  const session = userSessionStr ? JSON.parse(userSessionStr) : null
  const user = session?.user || session

  // Só mostra se houver usuário logado
  if (!user) return null

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading])

  // Iniciar saudação do assistente
  useEffect(() => {
    setMessages([
      {
        role: 'model',
        content: `Olá, ${user.nome}! Eu sou o assistente de inteligência artificial da RuivoBarber. ✂️\n\nPosso te ajudar a consultar nossos serviços, conhecer nossos barbeiros ou fazer um agendamento direto. Como posso ajudar você hoje?`
      }
    ])
  }, [user.nome])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!message.trim() || loading) return

    const userMessage = message.trim()
    setMessage('')
    setLoading(true)

    // Adiciona mensagem do usuário
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    let assistantText = ''
    // Adiciona placeholder da mensagem do assistente
    setMessages(prev => [...prev, { role: 'model', content: '' }])

    // Handler do SSE chunk
    const onChunk = (chunk) => {
      assistantText += chunk
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1].content = assistantText
        return copy
      })
    }

    const onError = (err) => {
      console.error(err)
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1].content = 'Desculpe, ocorreu um erro ao obter a resposta da IA. Tente novamente mais tarde.'
        return copy
      })
      setLoading(false)
    }

    const onDone = () => {
      setLoading(false)
      // Atualiza o histórico de conversação do Gemini
      setHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: assistantText }] }
      ])
      
      // Se a resposta sugerir que um agendamento foi criado no banco
      if (assistantText.toLowerCase().includes('confirmado') || assistantText.toLowerCase().includes('agendei') || assistantText.toLowerCase().includes('sucesso')) {
        // Disparar recarregamento de agendamentos na página atual
        const event = new CustomEvent('agendamentoCreated')
        window.dispatchEvent(event)
      }
    }

    // Chamar API de streaming
    // Mapear histórico para o formato do Gemini
    const geminiHistory = history.map(h => ({
      role: h.role,
      parts: h.parts
    }))

    await streamChat(userMessage, geminiHistory, onChunk, onError, onDone)
  }

  return (
    <>
      {/* Botão Flutuante */}
      <button 
        className="ai-chat-bubble"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #e94560, #f5a623)',
          border: 'none',
          boxShadow: '0 8px 32px rgba(233, 69, 96, 0.4)',
          color: '#fff',
          fontSize: '1.8rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Janela do Chat */}
      {isOpen && (
        <div 
          className="ai-chat-window fade-in-up"
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            width: '380px',
            height: '500px',
            borderRadius: '16px',
            background: 'rgba(22, 33, 62, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(233, 69, 96, 0.3)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <div 
            style={{
              padding: '1rem',
              background: 'linear-gradient(90deg, rgba(233,69,96,0.9), rgba(245,166,35,0.9))',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🤖</span>
            <div>
              <h4 style={{ margin: 0, fontWeight: 700 }}>Assistente RuivoBarber</h4>
              <small style={{ color: 'rgba(255,255,255,0.8)' }}>Online • Inteligência Artificial</small>
            </div>
          </div>

          {/* Área de Mensagens */}
          <div 
            style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {messages.map((m, idx) => (
              <div 
                key={idx}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: m.role === 'user' ? '#e94560' : 'rgba(15, 52, 96, 0.9)',
                  color: '#fff',
                  padding: '0.8rem 1rem',
                  borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.content || (
                  <span className="typing-dots">
                    <span style={{ animationDelay: '0s' }}>•</span>
                    <span style={{ animationDelay: '0.2s' }}>•</span>
                    <span style={{ animationDelay: '0.4s' }}>•</span>
                  </span>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Form */}
          <form 
            onSubmit={handleSend}
            style={{
              padding: '0.8rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              gap: '0.5rem',
              background: 'rgba(15, 52, 96, 0.4)',
            }}
          >
            <input 
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(233, 69, 96, 0.3)',
                background: 'rgba(15, 52, 96, 0.8)',
                color: '#fff',
                outline: 'none',
                fontSize: '0.9rem',
              }}
              disabled={loading}
            />
            <button 
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #e94560, #f5a623)',
                color: '#fff',
                border: 'none',
                padding: '0 1.2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'opacity 0.2s',
              }}
              disabled={loading || !message.trim()}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  )
}
