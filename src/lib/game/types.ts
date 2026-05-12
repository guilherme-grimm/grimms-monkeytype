export const languages = [
  'javascript',
  'typescript',
  'python',
  'go',
  'java',
  'kotlin',
  'ruby',
  'php',
] as const

export type LanguageId = (typeof languages)[number]

export type DisplayToken = {
  value: string
  scoringIndex: number | null
}

export type Snippet = {
  id: string
  language: LanguageId
  source: string
}

export type NormalizedSnippet = Snippet & {
  normalized: string
  displayTokens: Array<DisplayToken>
}

export type RoundStatus = 'idle' | 'active' | 'finished'

export type RoundMetrics = {
  score: number
  baseScore: number
  multiplier: number
  mode: DifficultyPreset
  roundShape: RoundShape
  // Survival accumulates +0.001 multiplier increments mid-run; persisted
  // separately so future rebalances of base multipliers don't rewrite the
  // survival contribution. Always 0 for timed rounds.
  survivalBonus: number
  wpm: number
  cpm: number
  accuracy: number
  correctChars: number
  incorrectChars: number
  totalTypedChars: number
  snippetsCompleted: number
}

export type LocalBestScore = RoundMetrics & {
  language: LanguageId
  achievedAt: string
}

import type { DifficultyPreset } from './difficulty'
import type { ImmersionPrefs } from './immersion-prefs'
import type { ModSet } from './mods'
import type { RoundShape } from './round-shape'

export type StoredPreferences = {
  lastLanguage?: LanguageId
  typingSoundEnabled?: boolean
  hasSeenPlayOnboarding?: boolean
  difficultyPreset?: DifficultyPreset
  immersion?: Partial<ImmersionPrefs>
  customMods?: ModSet
  roundShape?: RoundShape
  settingsHintSeen?: boolean
  hasSeenHomeOnboarding?: boolean
  buttonSoundEnabled?: boolean
}
