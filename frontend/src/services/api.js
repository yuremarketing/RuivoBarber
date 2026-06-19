import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080/api/v1'
    : '/api/v1')
})

api.interceptors.request.use(
  config => {
    const userSessionStr = localStorage.getItem('ruivobarber_user')
    if (userSessionStr) {
      try {
        const userSession = JSON.parse(userSessionStr)
        if (userSession && userSession.token) {
          config.headers['Authorization'] = `Bearer ${userSession.token}`
        }
      } catch (e) {
        console.error('Erro ao ler token do localStorage:', e)
      }
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  response => {
    console.log('API Request URL:', response.config.baseURL + response.config.url)
    return response
  },
  error => {
    if (error.config) {
      console.log('API Request URL (Failed):', error.config.baseURL + error.config.url)
    }
    return Promise.reject(error)
  }
)

export const login = (login, senha) => api.post('/auth/login', { login, senha })
export const registrarPublico = (nome, login, senha) => api.post('/auth/register', { nome, login, senha })
export const loginComGoogle = (idToken) => api.post('/auth/google', { id_token: idToken })
export const listarClientes = () => api.get('/clientes')
export const cadastrarCliente = (nome, login, senha) => api.post('/clientes', { nome, login, senha })
export const buscarCliente = (id) => api.get(`/clientes/${id}`)
export const healthCheck = () => api.get('/health')
export const resgatarCupom = (clienteId, nivelId) => api.post('/cupons/resgatar', { cliente_id: Number(clienteId), nivel_id: Number(nivelId) })
export const validarCupom = (codigo) => api.post('/cupons/validar', { codigo })
export const concluirAtendimento = (agendamentoId) => api.post('/atendimentos/concluir', { agendamento_id: Number(agendamentoId) })
export const registrarFalta = (agendamentoId) => api.post('/atendimentos/falta', { agendamento_id: Number(agendamentoId) })
export const atualizarPerfil = (id, dados) => api.put(`/clientes/${id}/perfil`, dados)
export const fetchConfiguracoes = () => api.get('/configuracoes')
export const salvarConfiguracoes = (dados) => api.post('/configuracoes', dados)

export const fetchTemporadas = () => api.get('/temporadas')
export const fetchTemporadaAtiva = () => api.get('/temporadas/ativa')
export const criarTemporada = (nome, dataInicio, dataFim, ativa) => api.post('/temporadas', { nome, dataInicio, dataFim, ativa })
export const atualizarTemporada = (id, nome, dataInicio, dataFim, ativa) => api.put(`/temporadas/${id}`, { nome, dataInicio, dataFim, ativa })

export const fetchServicos = () => api.get('/servicos')

export const fetchBarbeiros = () => api.get('/barbeiros')
export const fetchAgendaBarbeiro = (barbeiroId, data, servicoId) => {
  let url = `/barbeiros/${barbeiroId}/agenda?data=${data}`
  if (servicoId) {
    url += `&servico_id=${servicoId}`
  }
  return api.get(url)
}
export const fetchAgendamentos = () => api.get('/agendamentos')
export const criarAgendamento = (barbeiroId, servicoId, dataHora) => api.post('/agendamentos', {
  barbeiro_id: Number(barbeiroId),
  servico_id: Number(servicoId),
  data_hora: dataHora
})

export const streamChat = async (message, history, onChunk, onError, onDone) => {
  try {
    const userSessionStr = localStorage.getItem('ruivobarber_user')
    const headers = {
      'Content-Type': 'application/json'
    }
    if (userSessionStr) {
      const userSession = JSON.parse(userSessionStr)
      if (userSession && userSession.token) {
        headers['Authorization'] = `Bearer ${userSession.token}`
      }
    }

    const baseURL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:8080/api/v1'
      : '/api/v1')

    const response = await fetch(`${baseURL}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, history })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.slice(5).trim()
          if (dataStr === '[DONE]') {
            onDone()
            return
          }
          try {
            const parsed = JSON.parse(dataStr)
            if (parsed.error) {
              onError(parsed.error)
            } else if (parsed.text) {
              onChunk(parsed.text)
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e)
          }
        }
      }
    }
  } catch (e) {
    onError(e.message || e)
  }
}

export default api


