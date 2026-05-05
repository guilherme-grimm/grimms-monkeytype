export function createTypingSoundPlayer() {
  let audioContext: AudioContext | null = null

  function getAudioContext() {
    if (typeof window === 'undefined') {
      return null
    }

    if (!audioContext) {
      audioContext = new window.AudioContext()
    }

    return audioContext
  }

  return {
    async play() {
      const context = getAudioContext()

      if (!context) {
        return
      }

      if (context.state === 'suspended') {
        await context.resume()
      }

      const oscillator = context.createOscillator()
      const overtone = context.createOscillator()
      const gainNode = context.createGain()
      const overtoneGain = context.createGain()
      const filter = context.createBiquadFilter()
      const now = context.currentTime

      oscillator.type = 'triangle'
      overtone.type = 'sine'
      oscillator.frequency.setValueAtTime(210, now)
      oscillator.frequency.exponentialRampToValueAtTime(180, now + 0.05)
      overtone.frequency.setValueAtTime(520, now)
      overtone.frequency.exponentialRampToValueAtTime(430, now + 0.04)

      gainNode.gain.setValueAtTime(0.0001, now)
      gainNode.gain.exponentialRampToValueAtTime(0.018, now + 0.004)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)

      overtoneGain.gain.setValueAtTime(0.0001, now)
      overtoneGain.gain.exponentialRampToValueAtTime(0.006, now + 0.003)
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1100, now)
      filter.Q.setValueAtTime(0.4, now)

      oscillator.connect(gainNode)
      overtone.connect(overtoneGain)
      gainNode.connect(filter)
      overtoneGain.connect(filter)
      filter.connect(context.destination)

      oscillator.start(now)
      overtone.start(now)
      oscillator.stop(now + 0.065)
      overtone.stop(now + 0.04)
    },
  }
}
