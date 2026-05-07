import { describe, expect, test } from 'vitest'

import {
  calculateRoundMetrics,
  consumeSnippetInput,
  countMatchingPrefix,
  isSnippetComplete,
  rankFor,
  scoreAppendedChars,
} from './scoring'

describe('scoring helpers', () => {
  test('counts only the matching prefix', () => {
    expect(countMatchingPrefix('const x', 'const y')).toBe(6)
    expect(countMatchingPrefix('abc', 'abc')).toBe(3)
  })

  test('detects snippet completion by reaching the boundary', () => {
    expect(isSnippetComplete('return value', 'return value')).toBe(true)
    expect(isSnippetComplete('return valu', 'return value')).toBe(false)
    expect(isSnippetComplete('return value;', 'return value')).toBe(true)
    expect(isSnippetComplete('return valuz', 'return value')).toBe(true)
  })

  test('scores appended chars only through the target boundary', () => {
    expect(
      scoreAppendedChars({
        appendedValue: 'ue;',
        previousValueLength: 'return val'.length,
        target: 'return value',
        correctChars: 'return val'.length,
        incorrectChars: 0,
        correctStreak: 'return val'.length,
      }),
    ).toEqual({
      correctChars: 'return value'.length,
      incorrectChars: 0,
      correctStreak: 'return value'.length,
      sawError: false,
    })
  })

  test('still counts mismatches before the target boundary', () => {
    expect(
      scoreAppendedChars({
        appendedValue: 'uX;',
        previousValueLength: 'return val'.length,
        target: 'return value',
        correctChars: 'return val'.length,
        incorrectChars: 0,
        correctStreak: 'return val'.length,
      }),
    ).toEqual({
      correctChars: 'return valu'.length,
      incorrectChars: 1,
      correctStreak: 0,
      sawError: true,
    })
  })

  test('returns the carry-over remainder after completing a snippet', () => {
    expect(
      consumeSnippetInput({
        typedValue: 'return value;co',
        previousValueLength: 'return val'.length,
        target: 'return value',
        correctChars: 'return val'.length,
        incorrectChars: 0,
        correctStreak: 'return val'.length,
      }),
    ).toEqual({
      correctChars: 'return value'.length,
      incorrectChars: 0,
      correctStreak: 'return value'.length,
      sawError: false,
      complete: true,
      remainder: ';co',
    })
  })

  test('can consume the carried remainder against the next snippet', () => {
    const first = consumeSnippetInput({
      typedValue: 'return valueconst x',
      previousValueLength: 'return val'.length,
      target: 'return value',
      correctChars: 'return val'.length,
      incorrectChars: 0,
      correctStreak: 'return val'.length,
    })

    expect(first.complete).toBe(true)
    expect(first.remainder).toBe('const x')

    expect(
      consumeSnippetInput({
        typedValue: first.remainder,
        previousValueLength: 0,
        target: 'const xyz',
        correctChars: first.correctChars,
        incorrectChars: first.incorrectChars,
        correctStreak: first.correctStreak,
      }),
    ).toEqual({
      correctChars: 'return valueconst x'.length,
      incorrectChars: 0,
      correctStreak: 'return valueconst x'.length,
      sawError: false,
      complete: false,
      remainder: 'const x',
    })
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
