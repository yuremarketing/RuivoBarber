import confetti from 'canvas-confetti'

// Função auxiliar para tocar uma frequência
const playTone = (ctx, frequency, type, duration, startTime) => {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)
  
  // Envelope simples para evitar cliques (Fade In/Out rápido)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05)
  gain.gain.setValueAtTime(0.1, startTime + duration - 0.05)
  gain.gain.linearRampToValueAtTime(0, startTime + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.start(startTime)
  osc.stop(startTime + duration)
}

// 1. Som de Resgate de Cupom (Estilo Coin / Moeda)
export const playRedeemSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const now = ctx.currentTime
    // Frequência tipo moeda (B5 e E6)
    playTone(ctx, 987.77, 'square', 0.1, now)
    playTone(ctx, 1318.51, 'square', 0.3, now + 0.1)
  } catch (e) {
    console.log('Audio disabled or not supported', e)
  }
}

// 2. Som de Level Up (Arpejo de Fanfarra)
export const playLevelUpSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const now = ctx.currentTime
    
    // Arpejo ascendente (C4, E4, G4, C5)
    playTone(ctx, 261.63, 'square', 0.15, now)
    playTone(ctx, 329.63, 'square', 0.15, now + 0.15)
    playTone(ctx, 392.00, 'square', 0.15, now + 0.3)
    playTone(ctx, 523.25, 'square', 0.4, now + 0.45)
  } catch (e) {
    console.log('Audio disabled or not supported', e)
  }
}

// 3. Efeito Visual de Confete
export const fireConfetti = () => {
  const duration = 2.5 * 1000
  const end = Date.now() + duration

  ;(function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#f1c40f', '#e74c3c', '#3498db']
    })
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#f1c40f', '#e74c3c', '#3498db']
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }())
}
