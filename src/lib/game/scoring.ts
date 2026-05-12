import { DEFAULT_DIFFICULTY, type DifficultyPreset, presetMultiplier } from './difficulty'
import { DEFAULT_MODS, type ModSet, modsMultiplier } from './mods'
import { DEFAULT_ROUND_SHAPE, type RoundShape } from './round-shape'
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

export function scoreAppendedChars(input: {
  appendedValue: string
  previousValueLength: number
  target: string
  correctChars: number
  incorrectChars: number
  correctStreak: number
}) {
  let nextCorrectChars = input.correctChars
  let nextIncorrectChars = input.incorrectChars
  let runningStreak = input.correctStreak
  let sawError = false

  for (let index = 0; index < input.appendedValue.length; index += 1) {
    const targetIndex = input.previousValueLength + index

    // Stop scoring chars typed past the snippet's last position — those are
    // overshoot from a fast keystroke landing the user past the end, not a
    // wrong answer to a real target.
    if (targetIndex >= input.target.length) break

    if (input.appendedValue[index] === input.target[targetIndex]) {
      nextCorrectChars += 1
      runningStreak += 1
    } else {
      nextIncorrectChars += 1
      runningStreak = 0
      sawError = true
    }
  }

  return {
    correctChars: nextCorrectChars,
    incorrectChars: nextIncorrectChars,
    correctStreak: runningStreak,
    sawError,
  }
}

export function consumeSnippetInput(input: {
  typedValue: string
  previousValueLength: number
  target: string
  correctChars: number
  incorrectChars: number
  correctStreak: number
}) {
  const appendedValue = input.typedValue.slice(input.previousValueLength)
  const score = scoreAppendedChars({
    appendedValue,
    previousValueLength: input.previousValueLength,
    target: input.target,
    correctChars: input.correctChars,
    incorrectChars: input.incorrectChars,
    correctStreak: input.correctStreak,
  })
  const complete = isSnippetComplete(input.typedValue, input.target)

  return {
    ...score,
    complete,
    remainder: complete ? input.typedValue.slice(input.target.length) : input.typedValue,
  }
}

// Snippet completion is boundary-based, not accuracy-based: once the player
// has consumed at least `target.length` chars, the next snippet should become
// active immediately. Correctness is already tracked per keystroke; blocking
// advancement on a mismatch dead-ends the survival loop on the current snippet.
export function isSnippetComplete(typed: string, target: string) {
  return typed.length >= target.length
}

export function calculateRoundMetrics(input: {
  correctChars: number
  incorrectChars: number
  elapsedMs: number
  snippetsCompleted: number
  mode?: DifficultyPreset
  mods?: ModSet
  roundShape?: RoundShape
  // Survival accumulates +0.001 multiplier increments mid-run; the final
  // multiplier persisted on the row stacks this onto the base multiplier.
  survivalBonus?: number
}): RoundMetrics {
  const mode = input.mode ?? DEFAULT_DIFFICULTY
  const roundShape = input.roundShape ?? DEFAULT_ROUND_SHAPE
  const survivalBonus = roundShape === 'survival' ? (input.survivalBonus ?? 0) : 0
  const baseMultiplier =
    mode === 'custom' ? modsMultiplier(input.mods ?? DEFAULT_MODS) : presetMultiplier(mode)
  const multiplier = baseMultiplier + survivalBonus
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
    multiplier: Math.round(multiplier * 1000) / 1000,
    mode,
    roundShape,
    survivalBonus: Math.round(survivalBonus * 1000) / 1000,
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
