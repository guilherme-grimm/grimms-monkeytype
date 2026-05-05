import { describe, expect, test } from 'vitest'

import { shouldReplaceBest } from './storage'

describe('best score replacement', () => {
  test('prefers higher score, then higher accuracy', () => {
    const currentBest = {
      language: 'javascript' as const,
      score: 300,
      wpm: 60,
      cpm: 300,
      accuracy: 92,
      correctChars: 150,
      incorrectChars: 13,
      totalTypedChars: 163,
      snippetsCompleted: 4,
      achievedAt: '2026-05-04T00:00:00.000Z',
    }

    expect(
      shouldReplaceBest(currentBest, {
        ...currentBest,
        score: 301,
        achievedAt: '2026-05-05T00:00:00.000Z',
      }),
    ).toBe(true)

    expect(
      shouldReplaceBest(currentBest, {
        ...currentBest,
        score: 300,
        accuracy: 93,
        achievedAt: '2026-05-05T00:00:00.000Z',
      }),
    ).toBe(true)

    expect(
      shouldReplaceBest(currentBest, {
        ...currentBest,
        score: 299,
        accuracy: 100,
        achievedAt: '2026-05-05T00:00:00.000Z',
      }),
    ).toBe(false)
  })
})
