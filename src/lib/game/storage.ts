import type { RoundShape } from './round-shape'
import type { LanguageId, LocalBestScore, StoredPreferences } from './types'

const localBestScoresKey = 'typer.local-best-scores'
const storedPreferencesKey = 'typer.preferences'

// Per-(language, roundShape) keyed map. A legacy value (flat LocalBestScore
// under `[language]`) is migrated into `[language].timed` on read.
export type LocalBestScoreMap = Partial<
  Record<LanguageId, Partial<Record<RoundShape, LocalBestScore>>>
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

// A legacy entry has the `score` field at the language level (i.e. the value
// IS a LocalBestScore). The new shape nests under a roundShape key.
function isLegacyEntry(value: unknown): value is LocalBestScore {
  return isRecord(value) && typeof value.score === 'number'
}

export function loadLocalBestScores(): LocalBestScoreMap {
  const storage = getStorage()

  if (!storage) {
    return {}
  }

  try {
    const rawValue = storage.getItem(localBestScoresKey)

    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue)
    if (!isRecord(parsed)) {
      return {}
    }

    const result: LocalBestScoreMap = {}
    for (const [language, entry] of Object.entries(parsed)) {
      if (isLegacyEntry(entry)) {
        // Old flat shape — score is from before survival shipped, so it's
        // a timed run by definition.
        result[language as LanguageId] = { timed: entry }
      } else if (isRecord(entry)) {
        result[language as LanguageId] = entry as Partial<Record<RoundShape, LocalBestScore>>
      }
    }
    return result
  } catch {
    return {}
  }
}

export function saveLocalBestScores(value: LocalBestScoreMap) {
  const storage = getStorage()

  if (!storage) {
    return
  }

  try {
    storage.setItem(localBestScoresKey, JSON.stringify(value))
  } catch {
    return
  }
}

export function loadStoredPreferences(): StoredPreferences | null {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  try {
    const rawValue = storage.getItem(storedPreferencesKey)

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
  const storage = getStorage()

  if (!storage) {
    return
  }

  const currentValue = loadStoredPreferences() ?? {}

  try {
    storage.setItem(
      storedPreferencesKey,
      JSON.stringify({
        ...currentValue,
        ...value,
      }),
    )
  } catch {
    return
  }
}

export function shouldReplaceBest(
  currentBest: LocalBestScore | undefined,
  nextScore: LocalBestScore,
) {
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
