import React from 'react'
import PropTypes from 'prop-types'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <AlertCircle size={48} className="error-icon" />
      <h3>Ops! Algo deu errado.</h3>
      <p>{message || 'Não foi possível carregar os dados no momento.'}</p>
      {onRetry && (
        <button className="btn-primary" onClick={onRetry}>
          <RefreshCw size={16} />
          Tentar Novamente
        </button>
      )}
    </div>
  )
}

ErrorState.propTypes = {
  message: PropTypes.string,
  onRetry: PropTypes.func
}
