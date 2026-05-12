import { describe, expect, it, vi } from 'vitest'

import { submitScoreSchema } from '#/server/scores'

import { describeSubmissionError, type SubmitScoreFn, submitFinishedRun } from './score-submission'
import type { LocalBestScore } from './types'

function buildResult(overrides: Partial<LocalBestScore> = {}): LocalBestScore {
  return {
    language: 'javascript',
    score: 420,
    baseScore: 420,
    multiplier: 1,
    mode: 'normal',
    roundShape: 'timed',
    survivalBonus: 0,
    wpm: 60,
    cpm: 300,
    accuracy: 95,
    correctChars: 200,
    incorrectChars: 10,
    totalTypedChars: 210,
    snippetsCompleted: 5,
    achievedAt: '2026-05-09T12:00:00.000Z',
    ...overrides,
  }
}

describe('submitFinishedRun — anonymous run does NOT POST score', () => {
  it('returns an anon outcome and never invokes the submit function', async () => {
    const submitScore = vi.fn<SubmitScoreFn>()

    const outcome = await submitFinishedRun({
      result: buildResult(),
      elapsedMs: 30000,
      isAuthed: false,
      submitScore,
    })

    expect(outcome).toEqual({ kind: 'anon' })
    expect(submitScore).not.toHaveBeenCalled()
  })
})

describe('submitFinishedRun — authenticated run POSTs once with the expected payload', () => {
  it('calls submitScore exactly once with a server-schema-valid payload and returns the scoreId', async () => {
    const submitScore = vi.fn<SubmitScoreFn>().mockResolvedValue({ scoreId: 'score-abc' })
    const result = buildResult({ language: 'typescript', mode: 'hard', score: 999 })

    const outcome = await submitFinishedRun({
      result,
      elapsedMs: 30000,
      isAuthed: true,
      submitScore,
    })

    expect(submitScore).toHaveBeenCalledTimes(1)

    const [callArg] = submitScore.mock.calls[0]
    expect(callArg).toEqual({ data: { ...result, elapsedMs: 30000 } })

    // Strongest contract: the payload satisfies the server's Zod schema.
    // If the server tightens validation, this test fails first.
    const parsed = submitScoreSchema.safeParse(callArg.data)
    expect(parsed.success, parsed.error?.message).toBe(true)

    expect(outcome).toEqual({ kind: 'saved', scoreId: 'score-abc' })
  })

  it('captures HTTP status from a thrown error and reports an error outcome', async () => {
    const submitScore = vi
      .fn<SubmitScoreFn>()
      .mockRejectedValue(Object.assign(new Error('unauthorized'), { status: 401 }))

    const outcome = await submitFinishedRun({
      result: buildResult(),
      elapsedMs: 30000,
      isAuthed: true,
      submitScore,
    })

    expect(outcome.kind).toBe('error')
    if (outcome.kind === 'error') {
      expect(outcome.httpStatus).toBe(401)
    }
    expect(submitScore).toHaveBeenCalledTimes(1)
  })
})

describe('submitFinishedRun — validity gate', () => {
  it('rejects survival runs that ended during warmup without calling submit', async () => {
    const submitScore = vi.fn<SubmitScoreFn>()

    const outcome = await submitFinishedRun({
      result: buildResult({ roundShape: 'survival' }),
      elapsedMs: 20_000,
      isAuthed: true,
      submitScore,
    })

    expect(outcome).toEqual({ kind: 'rejected', reason: 'too-short' })
    expect(submitScore).not.toHaveBeenCalled()
  })

  it('rejects custom-timed strict deaths before the 30s timer without calling submit', async () => {
    const submitScore = vi.fn<SubmitScoreFn>()

    const outcome = await submitFinishedRun({
      result: buildResult({ mode: 'custom', roundShape: 'timed' }),
      elapsedMs: 15_000,
      isAuthed: true,
      submitScore,
      mods: {
        autoSkipNewlines: true,
        indentMode: 'auto',
        strict: true,
        punctuation: false,
        numbers: false,
        caseSensitive: false,
      },
    })

    expect(outcome).toEqual({ kind: 'rejected', reason: 'strict-died-early' })
    expect(submitScore).not.toHaveBeenCalled()
  })

  it('still submits a full-duration strict-timed run', async () => {
    const submitScore = vi.fn<SubmitScoreFn>().mockResolvedValue({ scoreId: 'score-ok' })

    const outcome = await submitFinishedRun({
      result: buildResult({ mode: 'custom', roundShape: 'timed' }),
      elapsedMs: 30_000,
      isAuthed: true,
      submitScore,
      mods: {
        autoSkipNewlines: true,
        indentMode: 'auto',
        strict: true,
        punctuation: false,
        numbers: false,
        caseSensitive: false,
      },
    })

    expect(outcome).toEqual({ kind: 'saved', scoreId: 'score-ok' })
    expect(submitScore).toHaveBeenCalledTimes(1)
  })
})

describe('describeSubmissionError', () => {
  it.each([
    [401, 'Session expired — sign in again to save your score.'],
    [422, 'Run rejected by server (invalid metrics). Try a fresh run.'],
    [500, 'Server error (500) saving score. Try again shortly.'],
    [503, 'Server error (503) saving score. Try again shortly.'],
    [undefined, 'Failed to save score. Try again.'],
    [400, 'Failed to save score. Try again.'],
  ])('maps HTTP %s to the expected message', (status, message) => {
    expect(describeSubmissionError(status)).toBe(message)
  })
})
