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

export const fetchLives = () => api.get('/lives')
export const fetchLiveAtiva = () => api.get('/lives/ativa')
export const criarLive = (titulo, url, plataforma, ativa) => api.post('/lives', { titulo, url, plataforma, ativa })
export const ativarLive = (id) => api.post(`/lives/${id}/ativar`)
export const excluirLive = (id) => api.delete(`/lives/${id}`)
export const fetchClas = () => api.get('/clas')
export const fetchMeuCla = () => api.get('/clas/me')
export const fetchClaMembros = (id) => api.get(`/clas/${id}/membros`)
export const criarCla = (nome, descricao) => api.post('/clas', { nome, descricao })
export const convidarUsuario = (convidadoId) => api.post('/clas/convidar', { convidadoId: Number(convidadoId) })
export const buscarJogadoresSemCla = (query) => api.get(`/jogadores/busca?query=${query}`)
export const fetchConvitesRecebidos = () => api.get('/clas/convites')
export const aceitarConvite = (id) => api.post(`/clas/convites/${id}/aceitar`)
export const recusarConvite = (id) => api.post(`/clas/convites/${id}/recusar`)
export const fetchClasMural = () => api.get('/clas/me/mural')
export const postarNoMural = (mensagem) => api.post('/clas/me/mural', { mensagem })
export const fetchClasMissoes = () => api.get('/clas/missoes')

export const fetchTemporadas = () => api.get('/temporadas')
export const fetchTemporadaAtiva = () => api.get('/temporadas/ativa')
export const criarTemporada = (nome, dataInicio, dataFim, ativa) => api.post('/temporadas', { nome, dataInicio, dataFim, ativa })
export const atualizarTemporada = (id, nome, dataInicio, dataFim, ativa) => api.put(`/temporadas/${id}`, { nome, dataInicio, dataFim, ativa })

export const fetchServicos = () => api.get('/servicos')
export const criarServico = (servico) => api.post('/servicos', servico)
export const atualizarServico = (id, servico) => api.put(`/servicos/${id}`, servico)
export const deletarServico = (id) => api.delete(`/servicos/${id}`)

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

export const fetchDisponibilidadeBarbeiro = (barbeiroId) => api.get(`/barbeiros/${barbeiroId}/disponibilidade`)
export const salvarDisponibilidadeBarbeiro = (barbeiroId, disps) => api.post(`/barbeiros/${barbeiroId}/disponibilidade`, disps)
export const fetchBloqueiosBarbeiro = (barbeiroId) => api.get(`/barbeiros/${barbeiroId}/bloqueios`)
export const adicionarBloqueioBarbeiro = (barbeiroId, data, motivo) => api.post(`/barbeiros/${barbeiroId}/bloqueios`, { data, motivo })
export const removerBloqueioBarbeiro = (barbeiroId, data) => api.delete(`/barbeiros/${barbeiroId}/bloqueios/${data}`)

// Badges / Conquistas
export const fetchMeusBadges = () => api.get('/badges/me')

// Loja / Cosméticos RPG
export const fetchLojaItens = () => api.get('/loja/itens')
export const comprarItem = (id) => api.post(`/loja/itens/${id}/comprar`)
export const equiparItem = (id) => api.post(`/loja/itens/${id}/equipar`)
export const desequiparItem = (id) => api.post(`/loja/itens/${id}/desequipar`)

export const salvarChavePixBarbeiro = (barbeiroId, chavePix) => api.post(`/barbeiros/${barbeiroId}/chave-pix`, { chave_pix: chavePix })
export const criarGorjeta = (barbeiroId, valor, agendamentoId = null) => api.post('/gorjetas', {
  barbeiro_id: Number(barbeiroId),
  valor: Number(valor),
  agendamento_id: agendamentoId ? Number(agendamentoId) : null
})
export const confirmarPagamentoGorjeta = (gorjetaId) => api.post(`/gorjetas/${gorjetaId}/confirmar`)
export const fetchGorjetasBarbeiro = (barbeiroId) => api.get(`/barbeiros/${barbeiroId}/gorjetas`)

// PDV / Controle de Caixa
export const abrirCaixa = (saldoInicial) => api.post('/pdv/caixa/abrir', { saldo_inicial: Number(saldoInicial) })
export const fecharCaixa = (saldoInformado) => api.post('/pdv/caixa/fechar', { saldo_informado: Number(saldoInformado) })
export const fetchStatusCaixa = () => api.get('/pdv/caixa/status')
export const movimentarCaixa = (tipo, valor, motivo) => api.post('/pdv/caixa/movimentar', { tipo, valor: Number(valor), motivo })
export const processarVenda = (dadosVenda) => api.post('/pdv/venda', dadosVenda)

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


