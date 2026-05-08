import { useEffect, useId, useMemo } from 'react'

import {
  type DebugConfig,
  resetDebugConfig,
  setDebugValue,
  useDebugConfig,
} from '#/lib/dev/debug-config'

type DebugPanelProps = {
  open: boolean
  onClose: () => void
}

type SliderSpec = {
  key: keyof DebugConfig
  label: string
  min: number
  max: number
  step: number
  unit?: string
}

const curveSliders: Array<SliderSpec> = [
  { key: 'curveDenominator', label: 'curve denominator', min: 10, max: 120, step: 1 },
  { key: 'curveExponent', label: 'curve exponent', min: 0.3, max: 1.0, step: 0.05 },
]

export function DebugPanel({ open, onClose }: DebugPanelProps) {
  const titleId = useId()
  const config = useDebugConfig()

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

  const curvePreview = useMemo(() => {
    const denom = Math.max(1, config.curveDenominator)
    const samples = [10, 20, 30, 45, 60, 90]
    return samples
      .map((s) => `${s}: ${Math.min(1, (s / denom) ** config.curveExponent).toFixed(2)}`)
      .join('  ')
  }, [config.curveDenominator, config.curveExponent])

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
        style={{ maxWidth: '28rem' }}
      >
        <header className="settings-drawer-header">
          <p className="eyebrow text-[var(--color-accent-glow)]">~/typer/dev/curve.cfg</p>
          <h2 id={titleId} className="text-2xl font-semibold terminal-text">
            DEBUG · CURVE
          </h2>
          <button
            className="settings-drawer-close"
            onClick={onClose}
            aria-label="Close debug panel"
            type="button"
          >
            ×
          </button>
        </header>

        <section className="settings-drawer-section">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className={config.applyOverrides ? 'button-accent' : 'button-secondary'}
              onClick={() => setDebugValue('applyOverrides', !config.applyOverrides)}
            >
              overrides {config.applyOverrides ? 'on' : 'off'}
            </button>
            <button type="button" className="button-secondary" onClick={() => resetDebugConfig()}>
              reset defaults
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            Master toggle for the streak → intensity curve. Visual + audio knobs live in user
            settings now.
          </p>
        </section>

        <section className="settings-drawer-section">
          <p className="eyebrow text-[var(--color-muted)]">curve</p>
          <div className="mt-3 flex flex-col gap-2">
            {curveSliders.map((spec) => {
              const value = config[spec.key] as number
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
                    onChange={(event) =>
                      setDebugValue(spec.key, Number(event.target.value) as never)
                    }
                    className="debug-slider"
                  />
                </label>
              )
            })}
          </div>
          <pre className="mt-2 whitespace-pre-wrap text-[10px] leading-tight text-[var(--color-muted)]">
            streak → intensity {curvePreview}
          </pre>
        </section>
      </aside>
    </div>
  )
}
