import type { LanguageId, LocalBestScore, StoredPreferences } from './types'

const localBestScoresKey = 'typer.local-best-scores'
const storedPreferencesKey = 'typer.preferences'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadLocalBestScores(): Partial<Record<LanguageId, LocalBestScore>> {
  if (!canUseStorage()) {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(localBestScoresKey)

    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue)
    return isRecord(parsed) ? (parsed as Partial<Record<LanguageId, LocalBestScore>>) : {}
  } catch {
    return {}
  }
}

export function saveLocalBestScores(value: Partial<Record<LanguageId, LocalBestScore>>) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(localBestScoresKey, JSON.stringify(value))
}

export function loadStoredPreferences(): StoredPreferences | null {
  if (!canUseStorage()) {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(storedPreferencesKey)

    if (!rawValue) {
      return null
    }

    const parsed = JSON.parse(rawValue)
    return isRecord(parsed) ? (parsed as StoredPreferences) : null
  } catch {
    return null
  }
}

export function saveStoredPreferences(value: StoredPreferences) {
  if (!canUseStorage()) {
    return
  }

  const currentValue = loadStoredPreferences() ?? {}

  window.localStorage.setItem(
    storedPreferencesKey,
    JSON.stringify({
      ...currentValue,
      ...value,
    }),
  )
}

export function shouldReplaceBest(currentBest: LocalBestScore | undefined, nextScore: LocalBestScore) {
  if (!currentBest) {
    return true
  }

  if (nextScore.score > currentBest.score) {
    return true
  }

  if (nextScore.score < currentBest.score) {
    return false
  }

  if (nextScore.accuracy > currentBest.accuracy) {
    return true
  }

  return false
}
