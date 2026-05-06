import { describe, expect, test } from 'vitest'

import { calculateRoundMetrics, countMatchingPrefix, isSnippetComplete, rankFor } from './scoring'

describe('scoring helpers', () => {
  test('counts only the matching prefix', () => {
    expect(countMatchingPrefix('const x', 'const y')).toBe(6)
    expect(countMatchingPrefix('abc', 'abc')).toBe(3)
  })

  test('detects exact snippet completion', () => {
    expect(isSnippetComplete('return value', 'return value')).toBe(true)
    expect(isSnippetComplete('return value;', 'return value')).toBe(false)
  })

  test('calculates round metrics from keystroke totals (default = normal × 1.0)', () => {
    expect(
      calculateRoundMetrics({
        correctChars: 150,
        incorrectChars: 15,
        elapsedMs: 30000,
        snippetsCompleted: 4,
      }),
    ).toEqual({
      score: 130,
      baseScore: 130,
      multiplier: 1,
      mode: 'normal',
      wpm: 60,
      cpm: 300,
      accuracy: 90.9,
      correctChars: 150,
      incorrectChars: 15,
      totalTypedChars: 165,
      snippetsCompleted: 4,
    })
  })

  test('applies the gentle multiplier on the final score, leaves baseScore untouched', () => {
    const easy = calculateRoundMetrics({
      correctChars: 150,
      incorrectChars: 15,
      elapsedMs: 30000,
      snippetsCompleted: 4,
      mode: 'easy',
    })
    expect(easy.baseScore).toBe(130)
    expect(easy.multiplier).toBeCloseTo(0.85)
    expect(easy.score).toBe(Math.round(130 * 0.85)) // 111

    const hard = calculateRoundMetrics({
      correctChars: 150,
      incorrectChars: 15,
      elapsedMs: 30000,
      snippetsCompleted: 4,
      mode: 'hard',
    })
    expect(hard.baseScore).toBe(130)
    expect(hard.multiplier).toBeCloseTo(1.25)
    expect(hard.score).toBe(Math.round(130 * 1.25)) // 163
  })

  test('wpm and cpm stay mechanically truthful across modes', () => {
    const normal = calculateRoundMetrics({
      correctChars: 150,
      incorrectChars: 15,
      elapsedMs: 30000,
      snippetsCompleted: 4,
      mode: 'normal',
    })
    const hard = calculateRoundMetrics({
      correctChars: 150,
      incorrectChars: 15,
      elapsedMs: 30000,
      snippetsCompleted: 4,
      mode: 'hard',
    })
    expect(hard.wpm).toBe(normal.wpm)
    expect(hard.cpm).toBe(normal.cpm)
    expect(hard.accuracy).toBe(normal.accuracy)
  })
})

describe('rankFor', () => {
  test('returns the right letter at threshold edges', () => {
    expect(rankFor(0)).toBe('D')
    expect(rankFor(79)).toBe('D')
    expect(rankFor(80)).toBe('C')
    expect(rankFor(129)).toBe('C')
    expect(rankFor(130)).toBe('B')
    expect(rankFor(174)).toBe('B')
    expect(rankFor(175)).toBe('A')
    expect(rankFor(219)).toBe('A')
    expect(rankFor(220)).toBe('S')
    expect(rankFor(999)).toBe('S')
  })
})
