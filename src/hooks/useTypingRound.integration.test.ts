import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Shrink the round duration so the lifecycle test can wait it out in real
// time (~120ms) instead of fighting fake-timer / jsdom interop. Hoisted by
// vitest's vi.mock so this lands before useTypingRound's import resolves.
vi.mock('#/lib/game/constants', async () => {
  const actual =
    await vi.importActual<typeof import('#/lib/game/constants')>('#/lib/game/constants')
  return { ...actual, roundDurationMs: 100 }
})

import { roundDurationMs } from '#/lib/game/constants'
import type { LocalBestScore } from '#/lib/game/types'
import { useTypingRound } from './useTypingRound'

type HarnessOptions = {
  difficulty?: 'easy' | 'normal' | 'hard'
}

function setupHook(options: HarnessOptions = {}) {
  const onFinish = vi.fn<(result: LocalBestScore, elapsedMs: number) => void>()
  const onSnippetAdvance = vi.fn()
  const onResetFocus = vi.fn()

  const { result } = renderHook(() =>
    useTypingRound({
      language: 'javascript',
      difficulty: options.difficulty,
      onFinish,
      onSnippetAdvance,
      onResetFocus,
    }),
  )

  return { result, onFinish, onSnippetAdvance, onResetFocus }
}

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('useTypingRound — round lifecycle', () => {
  it('idle → active on first keystroke → finished after duration; onFinish fires exactly once', async () => {
    const { result, onFinish } = setupHook()

    expect(result.current.status).toBe('idle')

    await act(async () => {
      result.current.handleValueChange('a')
    })
    expect(result.current.status).toBe('active')

    // Real-time wait — roundDurationMs is mocked to 100ms (vi.mock above), and
    // the hook polls every 50ms, so ~250ms guarantees the expiry tick has fired.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })

    expect(result.current.status).toBe('finished')
    expect(onFinish).toHaveBeenCalledTimes(1)

    const [submittedResult, elapsedMs] = onFinish.mock.calls[0]
    expect(elapsedMs).toBe(roundDurationMs)
    expect(submittedResult.language).toBe('javascript')
    expect(submittedResult.score).toBeGreaterThanOrEqual(0)
    expect(submittedResult.accuracy).toBeGreaterThanOrEqual(0)
  })
})

describe('useTypingRound — keystroke effects', () => {
  it('correct keystrokes advance score and grow the combo streak', () => {
    const { result } = setupHook()
    const target = result.current.currentSnippet.normalized
    const prefix = target.slice(0, 5)

    act(() => {
      result.current.handleValueChange(prefix)
    })

    expect(result.current.status).toBe('active')
    expect(result.current.correctStreak).toBe(prefix.length)
    expect(result.current.liveMetrics.correctChars).toBe(prefix.length)
    expect(result.current.liveMetrics.incorrectChars).toBe(0)
    expect(result.current.liveMetrics.score).toBeGreaterThan(0)
  })

  it('an incorrect keystroke breaks the combo and increments the error count', () => {
    const { result } = setupHook()
    const target = result.current.currentSnippet.normalized
    // Build a single-char input that is guaranteed not to match the first
    // target char. Falls back to 'x' if the first char is already 'z'.
    const wrongChar = target[0] === 'z' ? 'a' : 'z'

    act(() => {
      result.current.handleValueChange(wrongChar)
    })

    expect(result.current.correctStreak).toBe(0)
    expect(result.current.liveMetrics.incorrectChars).toBeGreaterThanOrEqual(1)
    expect(result.current.errorPulseToken).toBeGreaterThan(0)
  })
})

describe('useTypingRound — snippet completion', () => {
  it('typing the full snippet advances the queue and fires onSnippetAdvance', () => {
    const { result, onSnippetAdvance } = setupHook()
    const firstSnippet = result.current.currentSnippet
    const fullText = firstSnippet.normalized

    act(() => {
      result.current.handleValueChange(fullText)
    })

    expect(result.current.snippetsCompleted).toBe(1)
    expect(result.current.snippetClearedToken).toBeGreaterThan(0)
    expect(onSnippetAdvance).toHaveBeenCalledTimes(1)
    // The current snippet should now be a different snippet (the one that
    // was upcoming, or a freshly-drawn one if upcoming was a skeleton).
    expect(result.current.currentSnippet.id).not.toBe(firstSnippet.id)
    // Caret resets — typedValue is empty after a clean completion.
    expect(result.current.typedValue).toBe('')
  })
})
