import { useSyncExternalStore } from 'react'

// DEV-only store for tuning the streak → intensity curve. User-facing visual
// + audio knobs live in `immersion-prefs.ts` and are exposed in the settings
// drawer; this store stays gated behind `import.meta.env.DEV` because the
// curve is a mechanical decision we own.
export type DebugConfig = {
  applyOverrides: boolean
  curveDenominator: number
  curveExponent: number
}

export const DEFAULTS: DebugConfig = Object.freeze({
  applyOverrides: true,
  curveDenominator: 81,
  curveExponent: 0.75,
}) as DebugConfig

const isDev = import.meta.env.DEV
const STORAGE_KEY = 'typer.debug'

function loadFromStorage(): DebugConfig {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return { ...DEFAULTS, ...parsed }
    }
    return DEFAULTS
  } catch {
    return DEFAULTS
  }
}

function saveToStorage(value: DebugConfig) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // storage full / disabled — silently ignore in dev
  }
}

let current: DebugConfig = isDev ? loadFromStorage() : DEFAULTS
const listeners = new Set<() => void>()

export function setDebugValue<K extends keyof DebugConfig>(key: K, value: DebugConfig[K]) {
  if (!isDev) return
  current = { ...current, [key]: value }
  saveToStorage(current)
  for (const fn of listeners) fn()
}

export function resetDebugConfig() {
  if (!isDev) return
  current = { ...DEFAULTS }
  saveToStorage(current)
  for (const fn of listeners) fn()
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function getSnapshot() {
  return current
}

function getServerSnapshot() {
  return DEFAULTS
}

export function useDebugConfig(): DebugConfig {
  // In prod `current === DEFAULTS` forever and `listeners` is never notified,
  // so this collapses to a stable snapshot subscription with no overhead.
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// When the master `applyOverrides` toggle is off, every consumer sees DEFAULTS
// — except for `applyOverrides` itself so the panel can still flip it back on.
export function useEffectiveDebug(): DebugConfig {
  const config = useDebugConfig()
  if (!config.applyOverrides) {
    return { ...DEFAULTS, applyOverrides: false }
  }
  return config
}
