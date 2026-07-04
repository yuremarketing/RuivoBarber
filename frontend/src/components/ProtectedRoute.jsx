import React from 'react'
import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, allowedRoles }) {
  const userSessionStr = localStorage.getItem('ruivobarber_user')
  
  if (!userSessionStr) {
    // Not logged in, redirect to login
    return <Navigate to="/login" replace />
  }

  try {
    const userSession = JSON.parse(userSessionStr)
    const userRole = userSession?.cargo

    // If roles are specified and user's role is not included, redirect to dashboard
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />
    }

  } catch (e) {
    console.error('Error parsing user session in ProtectedRoute:', e)
    return <Navigate to="/login" replace />
  }

  return children
}
