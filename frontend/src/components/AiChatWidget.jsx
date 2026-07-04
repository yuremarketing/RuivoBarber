import React, { useState, useEffect, useRef } from 'react'
import { streamChat } from '../services/api.js'
import { Mic, MicOff } from 'lucide-react'

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [isListening, setIsListening] = useState(false)
  
  const chatEndRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Inicializa a API de Reconhecimento de Voz do navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    let rec = null
    if (SpeechRecognition) {
      rec = new SpeechRecognition()
      rec.continuous = false
      rec.interimResults = false
      rec.lang = 'pt-BR'

      rec.onstart = () => {
        setIsListening(true)
      }

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setMessage(prev => {
            const spacing = prev.trim() ? ' ' : ''
            return prev + spacing + transcript
          })
        }
      }

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        
        let msg = ''
        if (event.error === 'not-allowed') {
          msg = 'Acesso ao microfone negado. Certifique-se de que liberou as permissões de microfone nas configurações do seu navegador ou que está utilizando uma conexão segura (HTTPS).'
        } else if (event.error === 'no-microphone') {
          msg = 'Nenhum microfone foi detectado no seu dispositivo.'
        } else if (event.error === 'network') {
          msg = 'Erro de rede ao processar o áudio. Verifique sua conexão.'
        } else if (event.error === 'aborted') {
          return // Cancelado manualmente, sem aviso
        } else {
          msg = `Erro no reconhecimento de voz: ${event.error}`
        }
        alert(msg)
      }

      rec.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = rec
    }

    return () => {
      if (rec) {
        try {
          rec.stop()
        } catch (e) {
          // ignore if already stopped
        }
      }
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Seu navegador não suporta reconhecimento de voz ou a permissão de microfone foi negada.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.error('Failed to start speech recognition:', err)
      }
    }
  }

  const userSessionStr = localStorage.getItem('ruivobarber_user')
  const session = userSessionStr ? JSON.parse(userSessionStr) : null
  const user = session?.user || session

  useEffect(() => {
    if (isOpen && messages.length === 0 && user) {
      setMessages([
        {
          role: 'model',
          content: `Olá, ${user.nome}! Eu sou o assistente de inteligência artificial da RuivoBarber. \n\nPosso te ajudar a consultar nossos serviços, conhecer nossos barbeiros ou fazer um agendamento direto. Como posso ajudar você hoje?`
        }
      ])
    }
  }, [isOpen, messages.length, user])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Só mostra se houver usuário logado
  if (!user) return null

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
        className="aichat-bubble"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕' : ''}
      </button>

      {/* Janela do Chat */}
      {isOpen && (
        <div className="aichat-window fade-in-up">
          {/* Header */}
          <div className="aichat-header">
            <span style={{ fontSize: '1.5rem' }}></span>
            <div>
              <h4>Assistente RuivoBarber</h4>
              <small>Online • Inteligência Artificial</small>
            </div>
          </div>

          {/* Área de Mensagens */}
          <div className="aichat-messages">
            {messages.map((m, idx) => (
              <div 
                key={idx}
                className={`aichat-msg ${m.role === 'user' ? 'aichat-msg-user' : 'aichat-msg-model'}`}
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
            className="aichat-form"
          >
            <input 
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={isListening ? "Ouvindo... fale agora" : "Digite sua mensagem..."}
              className={`aichat-input ${isListening ? 'listening' : ''}`}
              disabled={loading}
            />
            <button 
              type="button"
              onClick={toggleListening}
              className={`aichat-mic-btn ${isListening ? 'listening' : ''}`}
              title={isListening ? "Parar de ouvir" : "Falar por voz (Microfone)"}
              disabled={loading}
            >
              {isListening ? <MicOff size={18} className="pulse-mic" /> : <Mic size={18} />}
            </button>
            <button 
              type="submit"
              className="aichat-submit-btn"
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
