import { useEffect, useSyncExternalStore } from 'react'

import { loadStoredPreferences, saveStoredPreferences } from './storage'

export type ImmersionPrefs = {
  vignette: boolean
  chromeDimming: boolean
  caretGlowEscalation: boolean
  snippetSaturation: boolean
  snapBack: boolean
  audioGainEscalation: boolean
  errorThunk: boolean

  vignetteDarkness: number
  vignetteTransitionMs: number
  metaOpacityDip: number
  controlsOpacityDip: number
  caretGlowCeilingPx: number
  snippetSaturationLift: number
  snapBackBrightness: number
  snapBackDurationMs: number
  audioGainCeiling: number
  errorThunkVolume: number
}

// Defaults match the values calibrated 2026-05-07 — these are also the CSS-var
// fallbacks in styles.css and the JS fallbacks in typing-sound.ts. Keeping all
// three in sync matters: if the user has never opened settings, no localStorage
// entry exists, the immersion-vars effect doesn't write anything, and CSS just
// uses these defaults.
export const IMMERSION_DEFAULTS: ImmersionPrefs = Object.freeze({
  vignette: true,
  chromeDimming: true,
  caretGlowEscalation: true,
  snippetSaturation: true,
  snapBack: true,
  audioGainEscalation: true,
  errorThunk: true,

  vignetteDarkness: 0.46,
  vignetteTransitionMs: 320,
  metaOpacityDip: 0.28,
  controlsOpacityDip: 0.18,
  caretGlowCeilingPx: 20,
  snippetSaturationLift: 0.29,
  snapBackBrightness: 0.82,
  snapBackDurationMs: 260,
  audioGainCeiling: 1.5,
  errorThunkVolume: 0.05,
}) as ImmersionPrefs

function loadFromStorage(): ImmersionPrefs {
  const stored = loadStoredPreferences()
  if (!stored?.immersion) return IMMERSION_DEFAULTS
  return { ...IMMERSION_DEFAULTS, ...stored.immersion }
}

let current: ImmersionPrefs = IMMERSION_DEFAULTS
let loadedFromStorage = false
const listeners = new Set<() => void>()

function syncFromStorageOnce() {
  if (loadedFromStorage || typeof window === 'undefined') {
    return
  }

  current = loadFromStorage()
  loadedFromStorage = true
}

function notify() {
  for (const fn of listeners) fn()
}

export function setImmersionPref<K extends keyof ImmersionPrefs>(key: K, value: ImmersionPrefs[K]) {
  loadedFromStorage = true
  current = { ...current, [key]: value }
  saveStoredPreferences({ immersion: current })
  notify()
}

export function resetImmersionPrefs() {
  loadedFromStorage = true
  current = { ...IMMERSION_DEFAULTS }
  saveStoredPreferences({ immersion: current })
  notify()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function getSnapshot() {
  syncFromStorageOnce()
  return current
}

function getServerSnapshot() {
  return IMMERSION_DEFAULTS
}

export function useImmersionPrefs(): ImmersionPrefs {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

const VAR_NAMES = [
  '--debug-vignette-darkness',
  '--debug-vignette-transition',
  '--debug-meta-opacity-dip',
  '--debug-controls-opacity-dip',
  '--debug-caret-glow-ceiling',
  '--debug-snippet-saturation-lift',
  '--debug-snapback-brightness',
  '--debug-snapback-duration',
] as const

// Mirrors prefs to <body> CSS custom properties so styles.css's
// `var(--debug-*, <default>)` reads pick up the user's choices live. The
// `--debug-*` prefix predates this becoming a user feature; kept stable so
// stylesheet reads don't churn. When a feature toggle is off, the var is set
// to a neutral value (0 / 1) that suppresses the effect rather than removing
// the var, so behavior is explicit instead of falling through to the default.
export function useApplyImmersionCssVars(): void {
  const prefs = useImmersionPrefs()
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement

    root.style.setProperty(
      '--debug-vignette-darkness',
      String(prefs.vignette ? prefs.vignetteDarkness : 0),
    )
    root.style.setProperty('--debug-vignette-transition', `${prefs.vignetteTransitionMs}ms`)
    root.style.setProperty(
      '--debug-meta-opacity-dip',
      String(prefs.chromeDimming ? prefs.metaOpacityDip : 0),
    )
    root.style.setProperty(
      '--debug-controls-opacity-dip',
      String(prefs.chromeDimming ? prefs.controlsOpacityDip : 0),
    )
    root.style.setProperty(
      '--debug-caret-glow-ceiling',
      `${prefs.caretGlowEscalation ? prefs.caretGlowCeilingPx : 0}px`,
    )
    root.style.setProperty(
      '--debug-snippet-saturation-lift',
      String(prefs.snippetSaturation ? prefs.snippetSaturationLift : 0),
    )
    root.style.setProperty(
      '--debug-snapback-brightness',
      String(prefs.snapBack ? prefs.snapBackBrightness : 1),
    )
    root.style.setProperty('--debug-snapback-duration', `${prefs.snapBackDurationMs}ms`)

    return () => {
      for (const name of VAR_NAMES) root.style.removeProperty(name)
    }
  }, [prefs])
}
