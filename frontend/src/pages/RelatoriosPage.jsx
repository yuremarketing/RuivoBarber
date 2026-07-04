import React, { useState, useEffect } from 'react'
import { fetchRelatorioComissoes } from '../services/api.js'
import ErrorState from '../components/ErrorState.jsx'

function RelatoriosPage() {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [relatorio, setRelatorio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Definir default para o mês atual
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    setDataInicio(firstDay.toISOString().split('T')[0])
    setDataFim(lastDay.toISOString().split('T')[0])
  }, [])

  const carregarRelatorio = async () => {
    if (!dataInicio || !dataFim) return
    setLoading(true)
    setError('')
    try {
      const res = await fetchRelatorioComissoes(dataInicio, dataFim)
      setRelatorio(res.data)
    } catch (err) {
      setError('Erro ao carregar o relatório de comissões. ' + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarRelatorio()
    }
  }, [dataInicio, dataFim])

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="fade-in-up">
      <div className="relatorios-header">
        <h2>Relatórios & Comissões</h2>
        <div className="relatorios-filters">
          <label className="relatorios-filter-label">De:</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input relatorios-filter-input" />
          <label className="relatorios-filter-label">Até:</label>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input relatorios-filter-input" />
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={carregarRelatorio} />}

      {loading ? (
        <p>Calculando fechamentos...</p>
      ) : relatorio ? (
        <>
          <div className="relatorios-grid">
            <div className="card relatorios-card relatorios-card--primary">
              <h4 className="relatorios-card-title">Faturamento (Serviços)</h4>
              <p className="relatorios-card-val relatorios-card-val--primary">
                {formatCurrency(relatorio.faturamento_total)}
              </p>
            </div>
            <div className="card relatorios-card relatorios-card--accent">
              <h4 className="relatorios-card-title">Total de Comissões</h4>
              <p className="relatorios-card-val relatorios-card-val--accent">
                {formatCurrency(relatorio.comissoes_totais)}
              </p>
            </div>
            <div className="card relatorios-card relatorios-card--success">
              <h4 className="relatorios-card-title">Lucro Bruto (Casa)</h4>
              <p className="relatorios-card-val relatorios-card-val--success">
                {formatCurrency(relatorio.lucro_liquido)}
              </p>
            </div>
            <div className="card relatorios-card relatorios-card--gold">
              <h4 className="relatorios-card-title">Total Gorjetas</h4>
              <p className="relatorios-card-val relatorios-card-val--gold">
                {formatCurrency(relatorio.gorjetas_totais)}
              </p>
            </div>
          </div>

          <div className="card">
            <h3 className="relatorios-table-header">Fechamento por Barbeiro</h3>
            
            {relatorio.comissoes_por_barbeiro && relatorio.comissoes_por_barbeiro.length > 0 ? (
              <div className="relatorios-table-wrapper">
                <table className="relatorios-table">
                  <thead>
                    <tr className="relatorios-tr-head">
                      <th className="relatorios-th">Barbeiro</th>
                      <th className="relatorios-th">Faturado</th>
                      <th className="relatorios-th">Comissão %</th>
                      <th className="relatorios-th">Valor Comissão</th>
                      <th className="relatorios-th">Gorjetas</th>
                      <th className="relatorios-th relatorios-th--right">Total a Pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.comissoes_por_barbeiro.map(b => (
                      <tr key={b.barbeiro_id} className="relatorios-tr-body">
                        <td className="relatorios-td relatorios-td-name">{b.nome_barbeiro}</td>
                        <td className="relatorios-td">{formatCurrency(b.total_faturado)}</td>
                        <td className="relatorios-td">{b.comissao_perc}%</td>
                        <td className="relatorios-td relatorios-td-accent">{formatCurrency(b.valor_comissao)}</td>
                        <td className="relatorios-td relatorios-td-gold">{formatCurrency(b.total_gorjetas)}</td>
                        <td className="relatorios-td relatorios-td-total">
                          {formatCurrency(b.total_a_pagar)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="relatorios-empty">Nenhum dado financeiro para este período.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default RelatoriosPage
