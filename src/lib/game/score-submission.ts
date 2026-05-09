import type { LocalBestScore } from './types'

export type SubmitScorePayload = LocalBestScore & { elapsedMs: number }

export type SubmitScoreFn = (input: { data: SubmitScorePayload }) => Promise<{ scoreId: string }>

export type SubmissionOutcome =
  | { kind: 'anon' }
  | { kind: 'saved'; scoreId: string }
  | { kind: 'error'; httpStatus?: number; cause: unknown }

// Pure, side-effect-isolated wrapper around the score-submission decision.
// Anonymous runs short-circuit before any network call. Authenticated runs
// invoke `submitScore` once and translate success/failure into a tagged
// outcome that the route layer maps onto its own setters/toast/UI state.
export async function submitFinishedRun(args: {
  result: LocalBestScore
  elapsedMs: number
  isAuthed: boolean
  submitScore: SubmitScoreFn
}): Promise<SubmissionOutcome> {
  const { result, elapsedMs, isAuthed, submitScore } = args

  if (!isAuthed) {
    return { kind: 'anon' }
  }

  try {
    const res = await submitScore({ data: { ...result, elapsedMs } })
    return { kind: 'saved', scoreId: res.scoreId }
  } catch (cause) {
    const httpStatus = (cause as { status?: number } | null)?.status
    return { kind: 'error', httpStatus, cause }
  }
}

export function describeSubmissionError(httpStatus: number | undefined): string {
  if (httpStatus === 401) {
    return 'Session expired — sign in again to save your score.'
  }
  if (httpStatus === 422) {
    return 'Run rejected by server (invalid metrics). Try a fresh run.'
  }
  if (httpStatus !== undefined && httpStatus >= 500) {
    return `Server error (${httpStatus}) saving score. Try again shortly.`
  }
  return 'Failed to save score. Try again.'
}
