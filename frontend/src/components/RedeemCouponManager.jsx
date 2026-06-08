import React, { useState } from 'react'

function RedeemCouponManager({ clienteId }) {
  const [codigo, setCodigo] = useState('')
  const [mensagem, setMensagem] = useState(null)

  const resgatar = async () => {
    // TODO: chamar endpoint POST /api/v1/cupons/resgatar
    setMensagem(`Cupom "${codigo}" enviado para validação!`)
    setCodigo('')
  }

  return (
    <div style={{ maxWidth: '400px', background: '#16213e', padding: '1rem', borderRadius: '10px', border: '1px solid #0f3460' }}>
      <h3 style={{ color: '#f5a623', marginTop: 0 }}>🎟️ Resgatar Cupom</h3>
      <input
        type="text"
        value={codigo}
        onChange={e => setCodigo(e.target.value)}
        placeholder="Código do cupom"
        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e94560', background: '#1a1a2e', color: '#fff', marginBottom: '0.5rem', boxSizing: 'border-box' }}
      />
      <button onClick={resgatar} style={{ background: '#e94560', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
        Resgatar
      </button>
      {mensagem && <p style={{ color: '#4caf50', marginTop: '0.5rem' }}>{mensagem}</p>}
    </div>
  )
}

export default RedeemCouponManager
