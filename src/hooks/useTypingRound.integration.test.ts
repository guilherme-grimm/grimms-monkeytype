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

// Shrink survival timing primitives so the integration test reaches the
// active phase + meter drain in real time without burning test seconds.
vi.mock('#/lib/game/round-shape', async () => {
  const actual =
    await vi.importActual<typeof import('#/lib/game/round-shape')>('#/lib/game/round-shape')
  return {
    ...actual,
    SURVIVAL: {
      ...actual.SURVIVAL,
      warmupMs: 50,
      meterCapMs: 100,
      drainPerMs: 1,
      gainPerStreakKeystroke: 0.05,
      multiplierStepThresholdMs: 1,
    },
  }
})

import { roundDurationMs } from '#/lib/game/constants'
import type { DifficultyPreset } from '#/lib/game/difficulty'
import { DEFAULT_MODS, type ModSet } from '#/lib/game/mods'
import type { RoundShape } from '#/lib/game/round-shape'
import type { LocalBestScore } from '#/lib/game/types'
import { useTypingRound } from './useTypingRound'

type HarnessOptions = {
  difficulty?: DifficultyPreset
  mods?: ModSet
  roundShape?: RoundShape
}

function setupHook(options: HarnessOptions = {}) {
  const onFinish = vi.fn<(result: LocalBestScore, elapsedMs: number) => void>()
  const onSnippetAdvance = vi.fn()
  const onResetFocus = vi.fn()

  const { result } = renderHook(() =>
    useTypingRound({
      language: 'javascript',
      difficulty: options.difficulty,
      mods: options.mods,
      roundShape: options.roundShape,
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

describe('useTypingRound — strict (death) mod', () => {
  it('first error in custom+strict ends the round; onFinish fires once', () => {
    const { result, onFinish } = setupHook({
      difficulty: 'custom',
      mods: { ...DEFAULT_MODS, strict: true },
    })

    const target = result.current.currentSnippet.normalized
    const wrongChar = target[0] === 'z' ? 'a' : 'z'

    act(() => {
      result.current.handleValueChange(wrongChar)
    })

    expect(result.current.status).toBe('finished')
    expect(onFinish).toHaveBeenCalledTimes(1)
    const [submitted] = onFinish.mock.calls[0]
    expect(submitted.mode).toBe('custom')
    expect(submitted.incorrectChars).toBeGreaterThanOrEqual(1)
  })

  it('clean typing in custom+strict does NOT end the round prematurely', () => {
    const { result } = setupHook({
      difficulty: 'custom',
      mods: { ...DEFAULT_MODS, strict: true },
    })

    const prefix = result.current.currentSnippet.normalized.slice(0, 4)

    act(() => {
      result.current.handleValueChange(prefix)
    })

    expect(result.current.status).toBe('active')
    expect(result.current.correctStreak).toBe(prefix.length)
  })

  it('strict mod is a no-op when difficulty is not custom', () => {
    const { result, onFinish } = setupHook({
      difficulty: 'normal',
      mods: { ...DEFAULT_MODS, strict: true },
    })

    const target = result.current.currentSnippet.normalized
    const wrongChar = target[0] === 'z' ? 'a' : 'z'

    act(() => {
      result.current.handleValueChange(wrongChar)
    })

    expect(result.current.status).toBe('active')
    expect(onFinish).not.toHaveBeenCalled()
  })
})

describe('useTypingRound — survival round shape', () => {
  it('finishes when the meter empties after warmup if the player stops typing', async () => {
    const { result, onFinish } = setupHook({ roundShape: 'survival' })

    // Kick off the round.
    await act(async () => {
      result.current.handleValueChange(result.current.currentSnippet.normalized.slice(0, 1))
    })
    expect(result.current.status).toBe('active')

    // Wait past warmup (50ms) + meter drain (~100ms) + interval slack.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350))
    })

    expect(result.current.status).toBe('finished')
    expect(onFinish).toHaveBeenCalledTimes(1)
    const [submitted] = onFinish.mock.calls[0]
    expect(submitted.roundShape).toBe('survival')
  })

  it('a single error during the active phase ends the survival round', async () => {
    const { result, onFinish } = setupHook({ roundShape: 'survival' })
    const target = result.current.currentSnippet.normalized
    const correct = target.slice(0, 1)

    // Type one correct char to start the round.
    await act(async () => {
      result.current.handleValueChange(correct)
    })

    // Wait past the warmup so the meter is active.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    expect(result.current.survivalActive).toBe(true)

    const wrong = target[1] === 'z' ? 'a' : 'z'
    act(() => {
      // Append the wrong char on top of the existing correct char.
      result.current.handleValueChange(correct + wrong)
    })

    expect(result.current.status).toBe('finished')
    expect(onFinish).toHaveBeenCalledTimes(1)
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

  it('survival: typing the full snippet advances the queue without ending the round', () => {
    const { result, onSnippetAdvance, onFinish } = setupHook({ roundShape: 'survival' })
    const firstSnippet = result.current.currentSnippet
    const fullText = firstSnippet.normalized

    act(() => {
      result.current.handleValueChange(fullText)
    })

    expect(result.current.snippetsCompleted).toBe(1)
    expect(onSnippetAdvance).toHaveBeenCalledTimes(1)
    expect(result.current.currentSnippet.id).not.toBe(firstSnippet.id)
    expect(result.current.typedValue).toBe('')
    // Run is still active mid-snippet, did not finish on advance.
    expect(result.current.status).toBe('active')
    expect(onFinish).not.toHaveBeenCalled()
  })
})
