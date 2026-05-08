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
    async play(streak = 0, intensity = 0, gainCeiling = 1.5) {
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
      const pitchMultiplier = 2 ** (semitones / 12)
      // Gain lift scales with immersion level — quiet at idle, fuller at peak.
      // `gainCeiling` is the max bump above baseline; defaults match the
      // hardcoded +50% but the debug panel can tune it live.
      const gainMultiplier = 1 + Math.max(0, Math.min(1, intensity)) * Math.max(0, gainCeiling)

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

    // Audible counterpart to the visual snap-back: a short low-frequency thump
    // when the streak resets. Filtered sawtooth dropping ~110→70Hz over 60ms
    // gives a "thud" that sits underneath the regular keystroke tone instead of
    // fighting it. Volume is tunable; frequency/decay stay constants until we
    // hear them in context and decide otherwise.
    async playError(volume = 0.05) {
      const context = getAudioContext()

      if (!context) {
        return
      }

      if (context.state === 'suspended') {
        await context.resume()
      }

      const safeVolume = Math.max(0, volume)
      if (safeVolume === 0) return

      const now = context.currentTime
      const osc = context.createOscillator()
      const gain = context.createGain()
      const filter = context.createBiquadFilter()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(110, now)
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.06)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(380, now)
      filter.Q.setValueAtTime(0.7, now)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(safeVolume, now + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(context.destination)

      osc.start(now)
      osc.stop(now + 0.1)
    },
  }
}

export type TypingSoundPlayer = ReturnType<typeof createTypingSoundPlayer>
