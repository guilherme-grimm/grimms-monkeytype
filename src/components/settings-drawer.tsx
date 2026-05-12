import { useEffect, useId, useRef, useState } from 'react'

import { type DifficultyPreset, difficultyPresets, PRESET_TOOLTIPS } from '#/lib/game/difficulty'
import {
  type ImmersionPrefs,
  resetImmersionPrefs,
  setImmersionPref,
  useImmersionPrefs,
} from '#/lib/game/immersion-prefs'
import { createTypingSoundPlayer, type TypingSoundPlayer } from '#/lib/game/typing-sound'
import {
  DEFAULT_MODS,
  MOD_TOGGLE_LABELS,
  type ModSet,
  modsMultiplier,
  normalizeMods,
} from '#/lib/game/mods'
import { DEFAULT_ROUND_SHAPE, type RoundShape, roundShapes } from '#/lib/game/round-shape'
import { loadStoredPreferences, saveStoredPreferences } from '#/lib/game/storage'

type SettingsDrawerProps = {
  open: boolean
  onClose: () => void
  // Optional: when the drawer is opened from inside an active /play session,
  // the parent passes its live state so the drawer mirrors it instead of
  // reading from storage and going out of sync. Omitting these makes the
  // drawer self-contained (home page case).
  difficulty?: DifficultyPreset
  onDifficultyChange?: (next: DifficultyPreset) => void
  mods?: ModSet
  onModsChange?: (next: ModSet) => void
  roundShape?: RoundShape
  onRoundShapeChange?: (next: RoundShape) => void
  typingSoundEnabled?: boolean
  onTypingSoundChange?: (next: boolean) => void
}

export function SettingsDrawer({
  open,
  onClose,
  difficulty: controlledDifficulty,
  onDifficultyChange,
  mods: controlledMods,
  onModsChange,
  roundShape: controlledRoundShape,
  onRoundShapeChange,
  typingSoundEnabled: controlledSound,
  onTypingSoundChange,
}: SettingsDrawerProps) {
  const titleId = useId()

  // Self-contained mode (no controlled props): hold local state mirrored from
  // storage so the home-page drawer just works without a parent wiring it up.
  const [localDifficulty, setLocalDifficulty] = useState<DifficultyPreset>('normal')
  const [localMods, setLocalMods] = useState<ModSet>(DEFAULT_MODS)
  const [localRoundShape, setLocalRoundShape] = useState<RoundShape>(DEFAULT_ROUND_SHAPE)
  const [localSound, setLocalSound] = useState<boolean>(true)
  const [buttonSoundEnabled, setButtonSoundEnabled] = useState<boolean>(true)
  // Preview the description for whichever preset is currently hovered/focused;
  // falls back to the selected preset. The floating `.has-tooltip` pattern got
  // clipped by the drawer's overflow boundary, so we render the description
  // inline instead and just swap which preset's text is shown.
  const [hoveredPreset, setHoveredPreset] = useState<DifficultyPreset | null>(null)

  useEffect(() => {
    if (!open) return
    if (
      controlledDifficulty !== undefined &&
      controlledSound !== undefined &&
      controlledMods !== undefined
    )
      return
    const stored = loadStoredPreferences()
    if (stored?.difficultyPreset) setLocalDifficulty(stored.difficultyPreset)
    if (typeof stored?.typingSoundEnabled === 'boolean') setLocalSound(stored.typingSoundEnabled)
    if (stored?.customMods) setLocalMods(normalizeMods(stored.customMods))
    if (stored?.roundShape === 'timed' || stored?.roundShape === 'survival') {
      setLocalRoundShape(stored.roundShape)
    }
    setButtonSoundEnabled(stored?.buttonSoundEnabled !== false)
  }, [open, controlledDifficulty, controlledSound, controlledMods])

  // Esc to close. Scoped to the drawer being open so we don't fight the
  // /play route's Esc-to-reset binding when the drawer isn't shown.
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [open, onClose])

  const difficulty = controlledDifficulty ?? localDifficulty
  const mods = controlledMods ?? localMods
  const roundShape = controlledRoundShape ?? localRoundShape
  const typingSoundEnabled = controlledSound ?? localSound

  function handleDifficultyChange(next: DifficultyPreset) {
    if (onDifficultyChange) {
      onDifficultyChange(next)
    } else {
      setLocalDifficulty(next)
      saveStoredPreferences({ difficultyPreset: next })
    }
  }

  function handleModsChange(next: ModSet) {
    if (onModsChange) {
      onModsChange(next)
    } else {
      setLocalMods(next)
      saveStoredPreferences({ customMods: next })
    }
  }

  function handleRoundShapeChange(next: RoundShape) {
    if (onRoundShapeChange) {
      onRoundShapeChange(next)
    } else {
      setLocalRoundShape(next)
      saveStoredPreferences({ roundShape: next })
    }
  }

  function handleSoundChange(next: boolean) {
    if (onTypingSoundChange) {
      onTypingSoundChange(next)
    } else {
      setLocalSound(next)
      saveStoredPreferences({ typingSoundEnabled: next })
    }
  }

  function handleButtonSoundChange(next: boolean) {
    setButtonSoundEnabled(next)
    saveStoredPreferences({ buttonSoundEnabled: next })
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="settings-drawer-backdrop"
      onClick={onClose}
    >
      <aside className="settings-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="settings-drawer-header">
          <p className="eyebrow text-[var(--color-accent-glow)]">~/typer/settings.cfg</p>
          <h2 id={titleId} className="text-2xl font-semibold terminal-text">
            Settings
          </h2>
          <button
            className="settings-drawer-close"
            onClick={onClose}
            aria-label="Close settings"
            type="button"
          >
            ×
          </button>
        </header>

        <section className="settings-drawer-section">
          <p className="eyebrow text-[var(--color-muted)]">round shape</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {roundShapes.map((shape) => (
              <button
                key={shape}
                type="button"
                className={shape === roundShape ? 'button-primary' : 'button-secondary'}
                onClick={() => handleRoundShapeChange(shape)}
              >
                {shape}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            {roundShape === 'survival'
              ? '25s safe warmup, then endless. Streak fuels the meter; after warmup, one mistake or empty meter ends the run. Separate leaderboard.'
              : 'Classic 30-second sprint. Score = base × difficulty multiplier.'}
          </p>
        </section>

        <section className="settings-drawer-section">
          <p className="eyebrow text-[var(--color-muted)]">difficulty</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {difficultyPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={preset === difficulty ? 'button-primary' : 'button-secondary'}
                onMouseEnter={() => setHoveredPreset(preset)}
                onMouseLeave={() => setHoveredPreset(null)}
                onFocus={() => setHoveredPreset(preset)}
                onBlur={() => setHoveredPreset(null)}
                onClick={() => handleDifficultyChange(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            {PRESET_TOOLTIPS[hoveredPreset ?? difficulty]}
          </p>
        </section>

        {difficulty === 'custom' && <CustomModsSection mods={mods} onChange={handleModsChange} />}

        <section className="settings-drawer-section">
          <p className="eyebrow text-[var(--color-muted)]">typing sound</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              className={typingSoundEnabled ? 'button-accent' : 'button-secondary'}
              onClick={() => handleSoundChange(!typingSoundEnabled)}
            >
              sound {typingSoundEnabled ? 'on' : 'off'}
            </button>
            <span className="text-sm text-[var(--color-muted)]">
              Phosphor click on every keystroke. Pitches up on streaks.
            </span>
          </div>
        </section>

        <section className="settings-drawer-section">
          <p className="eyebrow text-[var(--color-muted)]">button sound</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              className={buttonSoundEnabled ? 'button-accent' : 'button-secondary'}
              onClick={() => handleButtonSoundChange(!buttonSoundEnabled)}
            >
              sound {buttonSoundEnabled ? 'on' : 'off'}
            </button>
            <span className="text-sm text-[var(--color-muted)]">
              Short pixel blip on every button click. Tone varies by button kind.
            </span>
          </div>
        </section>

        <ImmersionSection />
      </aside>
    </div>
  )
}

const VISUAL_TOGGLES: Array<{ key: keyof ImmersionPrefs; label: string; hint: string }> = [
  { key: 'vignette', label: 'vignette', hint: 'radial fade as streak climbs' },
  { key: 'chromeDimming', label: 'chrome dim', hint: 'meta + control labels recede' },
  { key: 'caretGlowEscalation', label: 'caret glow', hint: 'caret pulse intensifies' },
  { key: 'snippetSaturation', label: 'snippet lift', hint: 'past-typed text saturates' },
  { key: 'snapBack', label: 'snap-back', hint: 'visual jolt on error' },
]

const AUDIO_TOGGLES: Array<{ key: keyof ImmersionPrefs; label: string; hint: string }> = [
  { key: 'audioGainEscalation', label: 'gain ramp', hint: 'streak → louder typing tone' },
  { key: 'errorThunk', label: 'error thunk', hint: 'low thump when streak breaks' },
]

const VISUAL_SLIDERS: Array<{
  key: keyof ImmersionPrefs
  label: string
  min: number
  max: number
  step: number
  unit?: string
}> = [
  { key: 'vignetteDarkness', label: 'vignette darkness', min: 0, max: 1, step: 0.01 },
  { key: 'caretGlowCeilingPx', label: 'caret glow ceiling', min: 0, max: 30, step: 1, unit: 'px' },
  { key: 'snippetSaturationLift', label: 'snippet saturation lift', min: 0, max: 0.6, step: 0.01 },
  { key: 'snapBackBrightness', label: 'snap-back brightness', min: 0.4, max: 1.0, step: 0.01 },
  {
    key: 'snapBackDurationMs',
    label: 'snap-back duration',
    min: 60,
    max: 400,
    step: 10,
    unit: 'ms',
  },
]

const AUDIO_SLIDERS: Array<{
  key: keyof ImmersionPrefs
  label: string
  min: number
  max: number
  step: number
  unit?: string
}> = [
  { key: 'audioGainCeiling', label: 'gain ramp ceiling', min: 0, max: 1.5, step: 0.05 },
  { key: 'errorThunkVolume', label: 'thunk volume', min: 0, max: 0.05, step: 0.001 },
]

function ImmersionSection() {
  const prefs = useImmersionPrefs()

  return (
    <section className="settings-drawer-section">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-[var(--color-muted)]">immersion</p>
        <button type="button" className="button-secondary" onClick={() => resetImmersionPrefs()}>
          reset
        </button>
      </div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Feel free to mess with how you like it.
      </p>

      <div className="mt-4">
        <p className="eyebrow text-[var(--color-muted)] text-[10px]">visual</p>
        <ImmersionToggles specs={VISUAL_TOGGLES} prefs={prefs} />
        <ImmersionSliders specs={VISUAL_SLIDERS} prefs={prefs} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-[var(--color-muted)] text-[10px]">audio</p>
          <AudioPreviewButton prefs={prefs} />
        </div>
        <ImmersionToggles specs={AUDIO_TOGGLES} prefs={prefs} />
        <ImmersionSliders specs={AUDIO_SLIDERS} prefs={prefs} />
      </div>
    </section>
  )
}

function AudioPreviewButton({ prefs }: { prefs: ImmersionPrefs }) {
  const playerRef = useRef<TypingSoundPlayer | null>(null)
  const [playing, setPlaying] = useState(false)

  async function handlePreview() {
    if (playing) return
    setPlaying(true)
    if (!playerRef.current) {
      playerRef.current = createTypingSoundPlayer()
    }
    const player = playerRef.current
    const gainCeiling = prefs.audioGainEscalation ? prefs.audioGainCeiling : 0
    // Four keystrokes with rising streak + intensity so the user hears the
    // pitch lift and gain ramp end-to-end. Spaced 110ms apart — close enough
    // to feel like fast typing, far enough that each tone is distinct.
    const steps = [
      { streak: 0, intensity: 0 },
      { streak: 10, intensity: 0.4 },
      { streak: 20, intensity: 0.7 },
      { streak: 30, intensity: 1 },
    ]
    steps.forEach((step, index) => {
      setTimeout(() => {
        void player.play(step.streak, step.intensity, gainCeiling)
      }, index * 110)
    })
    if (prefs.errorThunk) {
      setTimeout(
        () => {
          void player.playError(prefs.errorThunkVolume)
        },
        steps.length * 110 + 80,
      )
    }
    const total = steps.length * 110 + (prefs.errorThunk ? 220 : 80)
    setTimeout(() => setPlaying(false), total)
  }

  return (
    <button
      type="button"
      className="button-secondary"
      onClick={handlePreview}
      disabled={playing}
      data-no-button-sound
      title="Play a short streak + error thunk using your current audio settings"
    >
      {playing ? 'playing…' : 'test audio'}
    </button>
  )
}

function ImmersionToggles({
  specs,
  prefs,
}: {
  specs: Array<{ key: keyof ImmersionPrefs; label: string; hint: string }>
  prefs: ImmersionPrefs
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {specs.map((spec) => {
        const value = prefs[spec.key] as boolean
        return (
          <button
            key={spec.key as string}
            type="button"
            className={value ? 'button-accent' : 'button-secondary'}
            title={spec.hint}
            onClick={() => setImmersionPref(spec.key, !value as never)}
          >
            {spec.label}
          </button>
        )
      })}
    </div>
  )
}

function ImmersionSliders({
  specs,
  prefs,
}: {
  specs: Array<{
    key: keyof ImmersionPrefs
    label: string
    min: number
    max: number
    step: number
    unit?: string
  }>
  prefs: ImmersionPrefs
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {specs.map((spec) => {
        const value = prefs[spec.key] as number
        const decimals = spec.step < 1 ? Math.max(0, -Math.floor(Math.log10(spec.step))) : 0
        return (
          <label key={spec.key as string} className="flex flex-col gap-1 text-xs">
            <span className="flex items-center justify-between text-[var(--color-muted)]">
              <span>{spec.label}</span>
              <span className="tabular-nums text-[var(--color-text-strong)]">
                {value.toFixed(decimals)}
                {spec.unit ?? ''}
              </span>
            </span>
            <input
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={value}
              onChange={(event) => setImmersionPref(spec.key, Number(event.target.value) as never)}
              className="debug-slider"
            />
          </label>
        )
      })}
    </div>
  )
}

const MOD_TOGGLES: Array<{
  key: Exclude<keyof ModSet, 'indentMode'>
  hint: string
}> = [
  { key: 'autoSkipNewlines', hint: 'tab past empty lines' },
  { key: 'strict', hint: 'one mistake ends the round' },
  { key: 'caseSensitive', hint: 'foundation — content tweaks coming' },
  { key: 'punctuation', hint: 'foundation — content tweaks coming' },
  { key: 'numbers', hint: 'foundation — content tweaks coming' },
]

const INDENT_MODES: Array<{ value: ModSet['indentMode']; label: string; hint: string }> = [
  { value: 'auto', label: 'auto', hint: 'indent fills automatically' },
  { value: 'tab-helper', label: 'tab-helper', hint: 'tab fills the leading indent' },
  { value: 'literal', label: 'literal', hint: 'type every space' },
]

function CustomModsSection({ mods, onChange }: { mods: ModSet; onChange: (next: ModSet) => void }) {
  const multiplier = modsMultiplier(mods)
  return (
    <section className="settings-drawer-section">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-[var(--color-muted)]">custom mods</p>
        <span
          className="tabular-nums text-sm text-[var(--color-text-strong)]"
          title="live multiplier from active mods"
        >
          ×{multiplier.toFixed(2)}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Toggle what fights you. Multiplier scales with the heat.
      </p>

      <div className="mt-3">
        <p className="eyebrow text-[var(--color-muted)] text-[10px]">indent mode</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {INDENT_MODES.map((spec) => (
            <button
              key={spec.value}
              type="button"
              className={mods.indentMode === spec.value ? 'button-accent' : 'button-secondary'}
              title={spec.hint}
              onClick={() => onChange({ ...mods, indentMode: spec.value })}
            >
              {spec.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="eyebrow text-[var(--color-muted)] text-[10px]">toggles</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MOD_TOGGLES.map((spec) => {
            const value = mods[spec.key]
            return (
              <button
                key={spec.key}
                type="button"
                className={value ? 'button-accent' : 'button-secondary'}
                title={spec.hint}
                onClick={() => onChange({ ...mods, [spec.key]: !value })}
              >
                {MOD_TOGGLE_LABELS[spec.key]}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
