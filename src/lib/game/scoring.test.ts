import { describe, expect, test } from 'vitest'

import { calculateRoundMetrics, countMatchingPrefix, isSnippetComplete } from './scoring'

describe('scoring helpers', () => {
  test('counts only the matching prefix', () => {
    expect(countMatchingPrefix('const x', 'const y')).toBe(6)
    expect(countMatchingPrefix('abc', 'abc')).toBe(3)
  })

  test('detects exact snippet completion', () => {
    expect(isSnippetComplete('return value', 'return value')).toBe(true)
    expect(isSnippetComplete('return value;', 'return value')).toBe(false)
  })

  test('calculates round metrics from keystroke totals', () => {
    expect(
      calculateRoundMetrics({
        correctChars: 150,
        incorrectChars: 15,
        elapsedMs: 30000,
        snippetsCompleted: 4,
      }),
    ).toEqual({
      score: 300,
      cpm: 300,
      accuracy: 90.9,
      correctChars: 150,
      incorrectChars: 15,
      totalTypedChars: 165,
      snippetsCompleted: 4,
    })
  })
})
