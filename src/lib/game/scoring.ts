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
}): RoundMetrics {
  const elapsedMinutes = Math.max(input.elapsedMs, 1) / 60000
  const totalTypedChars = input.correctChars + input.incorrectChars
  const cpm = input.correctChars / elapsedMinutes
  const accuracy = totalTypedChars === 0 ? 100 : (input.correctChars / totalTypedChars) * 100
  const wpm = cpm / 5
  const normalizedAccuracy = accuracy / 100
  const score = 25 + (wpm * (1 + normalizedAccuracy)) / (2 - normalizedAccuracy)

  return {
    score: Math.round(score),
    wpm: Math.round(wpm * 10) / 10,
    cpm: Math.round(cpm),
    accuracy: Math.round(accuracy * 10) / 10,
    correctChars: input.correctChars,
    incorrectChars: input.incorrectChars,
    totalTypedChars,
    snippetsCompleted: input.snippetsCompleted,
  }
}
