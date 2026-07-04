import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { toast } from 'react-toastify'

export default function RpgListener() {
  const location = useLocation()
  const isLogin = location.pathname === '/login'
  const eventSourceRef = useRef(null)
  
  useEffect(() => {
    if (isLogin) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    const tenantId = localStorage.getItem('tenant_id') || '1'
    const token = localStorage.getItem('token') || ''
    const userId = '' // Extract from JWT if needed

    // Prevent duplicate connections across hot reloads
    if (eventSourceRef.current) return

    const connect = () => {
      // In production, token should be passed securely. EventSource does not support headers easily.
      // Can be passed via query string if needed: `/api/v1/stream?user_id=${userId}&token=${token}`
      const url = `/api/v1/stream?user_id=${userId}&tenant_id=${tenantId}`
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onopen = () => {
        console.log('[RPG Listener] SSE Connection opened')
      }

      es.onmessage = (event) => {
        if (event.type === 'heartbeat') return
      }

      es.addEventListener('XP_GRANTED', (event) => {
        handleRpgEvent(event, 'XP_GRANTED')
      })

      es.addEventListener('LEVEL_UP', (event) => {
        handleRpgEvent(event, 'LEVEL_UP')
      })

      es.addEventListener('ACHIEVEMENT_UNLOCKED', (event) => {
        handleRpgEvent(event, 'ACHIEVEMENT_UNLOCKED')
      })

      es.onerror = (err) => {
        console.error('[RPG Listener] SSE Error, attempting reconnect...', err)
        es.close()
        eventSourceRef.current = null
        setTimeout(connect, 3000)
      }
    }

    const handleRpgEvent = (event, type) => {
      const data = JSON.parse(event.data)
      const eventId = data.venda_id ? `${type}-${data.venda_id}` : `${type}-${Date.now()}`

      // Deduplication via LocalStorage (cross-tab and refresh protection)
      const processed = JSON.parse(localStorage.getItem('rpg_events_processed') || '[]')
      if (processed.includes(eventId)) {
        console.log(`[RPG Listener] Event ${eventId} already processed.`)
        return
      }

      // Add to processed buffer (keep last 100)
      processed.push(eventId)
      if (processed.length > 100) processed.shift()
      localStorage.setItem('rpg_events_processed', JSON.stringify(processed))

      // Trigger Visuals
      if (type === 'XP_GRANTED') {
        toast.success(`Você ganhou +${data.xp} XP!`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "dark",
        })
        
        // Dispatch global event for other components to update UI instantly
        window.dispatchEvent(new CustomEvent('RPG_XP_UPDATE', { detail: data }))
      } 
      else if (type === 'LEVEL_UP') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        })
        toast.info(`🎉 LEVEL UP! Nível alcançado: ${data.nivel}`, {
          icon: '👑'
        })
      }
      else if (type === 'ACHIEVEMENT_UNLOCKED') {
        confetti({
          particleCount: 100,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#FFA500', '#FF4500']
        })
        toast.warning(`🏆 CONQUISTA DESBLOQUEADA: ${data.nome}`)
      }
    }

    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [isLogin])

  return null // Headless component
}
