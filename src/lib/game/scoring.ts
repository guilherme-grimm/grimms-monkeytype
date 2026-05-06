import { DEFAULT_DIFFICULTY, type DifficultyPreset, presetMultiplier } from './difficulty'
import type { RoundMetrics } from './types'

export function countMatchingPrefix(typed: string, target: string) {
  let index = 0

  while (index < typed.length && index < target.length) {
    if (typed[index] !== target[index]) {
      break
    }

    index += 1
  }

  return index
}

export function isSnippetComplete(typed: string, target: string) {
  return typed === target
}

export function calculateRoundMetrics(input: {
  correctChars: number
  incorrectChars: number
  elapsedMs: number
  snippetsCompleted: number
  mode?: DifficultyPreset
}): RoundMetrics {
  const mode = input.mode ?? DEFAULT_DIFFICULTY
  const multiplier = presetMultiplier(mode)
  const elapsedMinutes = Math.max(input.elapsedMs, 1) / 60000
  const totalTypedChars = input.correctChars + input.incorrectChars
  const cpm = input.correctChars / elapsedMinutes
  const accuracy = totalTypedChars === 0 ? 100 : (input.correctChars / totalTypedChars) * 100
  const wpm = cpm / 5
  const normalizedAccuracy = accuracy / 100
  const baseScoreRaw = 25 + (wpm * (1 + normalizedAccuracy)) / (2 - normalizedAccuracy)
  const baseScore = Math.round(baseScoreRaw)

  return {
    score: Math.round(baseScoreRaw * multiplier),
    baseScore,
    multiplier,
    mode,
    wpm: Math.round(wpm * 10) / 10,
    cpm: Math.round(cpm),
    accuracy: Math.round(accuracy * 10) / 10,
    correctChars: input.correctChars,
    incorrectChars: input.incorrectChars,
    totalTypedChars,
    snippetsCompleted: input.snippetsCompleted,
  }
}

export type Rank = 'D' | 'C' | 'B' | 'A' | 'S'

// Thresholds calibrated against the post-multiplier score formula:
// score = round((25 + wpm·(1+acc)/(2-acc)) × multiplier).
// Reference points (Normal mode, ×1.0):
//   60 wpm @ 91% acc  → 130    (the existing test case)
//   80 wpm @ 95% acc  → ~173
//  100 wpm @ 98% acc  → ~219
//  120 wpm @ 100% acc → ~265
// Hard ×1.25 inflates these; Easy ×0.85 dampens them. The thresholds reward
// strong typists with realistic ranks and leave headroom for S in Hard mode.
export function rankFor(score: number): Rank {
  if (score >= 220) return 'S'
  if (score >= 175) return 'A'
  if (score >= 130) return 'B'
  if (score >= 80) return 'C'
  return 'D'
}
