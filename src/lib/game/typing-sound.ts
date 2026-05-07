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
    async play(streak = 0, intensity = 0) {
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

      // Streak-driven pitch lift: every 10 correct chars bumps a semitone (~1.0595×),
      // capped at +6 semitones so it stays in-genre rather than turning into a
      // theremin. Errors reset streak → tone snaps back to baseline next keystroke.
      const semitones = Math.min(6, Math.floor(streak / 10))
      const pitchMultiplier = Math.pow(2, semitones / 12)
      // Gain lift scales with immersion level — quiet at idle, fuller at peak.
      // Capped at +50% over baseline so the sound stays inside the phosphor
      // aesthetic instead of tipping into harsh.
      const gainMultiplier = 1 + Math.max(0, Math.min(1, intensity)) * 0.5

      oscillator.type = 'triangle'
      overtone.type = 'sine'
      oscillator.frequency.setValueAtTime(210 * pitchMultiplier, now)
      oscillator.frequency.exponentialRampToValueAtTime(180 * pitchMultiplier, now + 0.05)
      overtone.frequency.setValueAtTime(520 * pitchMultiplier, now)
      overtone.frequency.exponentialRampToValueAtTime(430 * pitchMultiplier, now + 0.04)

      gainNode.gain.setValueAtTime(0.0001, now)
      gainNode.gain.exponentialRampToValueAtTime(0.018 * gainMultiplier, now + 0.004)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)

      overtoneGain.gain.setValueAtTime(0.0001, now)
      overtoneGain.gain.exponentialRampToValueAtTime(0.006 * gainMultiplier, now + 0.003)
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
