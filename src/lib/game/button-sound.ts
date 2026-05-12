export type ButtonVariant = 'primary' | 'secondary' | 'accent'

const VARIANT_TONE: Record<ButtonVariant, { freq: number; durationMs: number }> = {
  primary: { freq: 880, durationMs: 45 },
  accent: { freq: 660, durationMs: 45 },
  secondary: { freq: 440, durationMs: 35 },
}

export function createButtonSoundPlayer() {
  let audioContext: AudioContext | null = null

  function getAudioContext() {
    if (typeof window === 'undefined') return null
    if (!audioContext) audioContext = new window.AudioContext()
    return audioContext
  }

  return {
    async playButtonClick(variant: ButtonVariant, volume = 0.06) {
      const context = getAudioContext()
      if (!context) return
      if (context.state === 'suspended') await context.resume()

      const { freq, durationMs } = VARIANT_TONE[variant]
      const now = context.currentTime
      const safeVolume = Math.max(0, Math.min(0.2, volume))
      if (safeVolume === 0) return

      const osc = context.createOscillator()
      const gain = context.createGain()
      const filter = context.createBiquadFilter()

      // Square waves are the pixel/chiptune signature. Lowpass keeps the
      // harmonic edge from feeling harsh on speakers.
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, now)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(freq * 3, now)
      filter.Q.setValueAtTime(0.5, now)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(safeVolume, now + 0.004)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(context.destination)

      osc.start(now)
      osc.stop(now + durationMs / 1000 + 0.01)
    },
  }
}

export type ButtonSoundPlayer = ReturnType<typeof createButtonSoundPlayer>

let sharedPlayer: ButtonSoundPlayer | null = null

export function getSharedButtonSoundPlayer(): ButtonSoundPlayer {
  if (!sharedPlayer) sharedPlayer = createButtonSoundPlayer()
  return sharedPlayer
}
