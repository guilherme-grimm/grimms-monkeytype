import { useEffect, useId, useState } from 'react'

import {
  difficultyPresets,
  PRESET_TOOLTIPS,
  type DifficultyPreset,
} from '#/lib/game/difficulty'
import {
  loadStoredPreferences,
  saveStoredPreferences,
} from '#/lib/game/storage'

type SettingsDrawerProps = {
  open: boolean
  onClose: () => void
  // Optional: when the drawer is opened from inside an active /play session,
  // the parent passes its live state so the drawer mirrors it instead of
  // reading from storage and going out of sync. Omitting these makes the
  // drawer self-contained (home page case).
  difficulty?: DifficultyPreset
  onDifficultyChange?: (next: DifficultyPreset) => void
  typingSoundEnabled?: boolean
  onTypingSoundChange?: (next: boolean) => void
}

export function SettingsDrawer({
  open,
  onClose,
  difficulty: controlledDifficulty,
  onDifficultyChange,
  typingSoundEnabled: controlledSound,
  onTypingSoundChange,
}: SettingsDrawerProps) {
  const titleId = useId()

  // Self-contained mode (no controlled props): hold local state mirrored from
  // storage so the home-page drawer just works without a parent wiring it up.
  const [localDifficulty, setLocalDifficulty] = useState<DifficultyPreset>('normal')
  const [localSound, setLocalSound] = useState<boolean>(true)

  useEffect(() => {
    if (!open) return
    if (controlledDifficulty !== undefined && controlledSound !== undefined) return
    const stored = loadStoredPreferences()
    if (stored?.difficultyPreset) setLocalDifficulty(stored.difficultyPreset)
    if (typeof stored?.typingSoundEnabled === 'boolean') setLocalSound(stored.typingSoundEnabled)
  }, [open, controlledDifficulty, controlledSound])

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
  const typingSoundEnabled = controlledSound ?? localSound

  function handleDifficultyChange(next: DifficultyPreset) {
    if (onDifficultyChange) {
      onDifficultyChange(next)
    } else {
      setLocalDifficulty(next)
      saveStoredPreferences({ difficultyPreset: next })
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

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="settings-drawer-backdrop"
      onClick={onClose}
    >
      <aside
        className="settings-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-drawer-header">
          <p className="eyebrow text-[var(--color-accent-glow)]">~/typer/settings.cfg</p>
          <h2 id={titleId} className="text-2xl font-semibold terminal-text">Settings</h2>
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
          <p className="eyebrow text-[var(--color-muted)]">difficulty</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {difficultyPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`has-tooltip ${preset === difficulty ? 'button-primary' : 'button-secondary'}`}
                data-tooltip={PRESET_TOOLTIPS[preset]}
                onClick={() => handleDifficultyChange(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            {PRESET_TOOLTIPS[difficulty]}
          </p>
        </section>

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
      </aside>
    </div>
  )
}
