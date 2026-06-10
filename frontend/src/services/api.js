import axios from 'axios'

const api = axios.create({
  baseURL: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080/api/v1'
    : '/api/v1'
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
export const listarClientes = () => api.get('/clientes')
export const cadastrarCliente = (nome, login, senha) => api.post('/clientes', { nome, login, senha })
export const buscarCliente = (id) => api.get(`/clientes/${id}`)
export const healthCheck = () => api.get('/health')
export const resgatarCupom = (clienteId, nivelId) => api.post('/cupons/resgatar', { cliente_id: Number(clienteId), nivel_id: Number(nivelId) })
export const validarCupom = (codigo) => api.post('/cupons/validar', { codigo })
export const concluirAtendimento = (agendamentoId) => api.post('/atendimentos/concluir', { agendamento_id: Number(agendamentoId) })
export const registrarFalta = (agendamentoId) => api.post('/atendimentos/falta', { agendamento_id: Number(agendamentoId) })

export default api

