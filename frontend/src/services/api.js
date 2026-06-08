import axios from 'axios'

const api = axios.create({
  baseURL: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8080/api/v1'
    : '/api/v1'
})

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

export const listarClientes = () => api.get('/clientes')
export const buscarCliente = (id) => api.get(`/clientes/${id}`)
export const healthCheck = () => api.get('/health')

export default api
