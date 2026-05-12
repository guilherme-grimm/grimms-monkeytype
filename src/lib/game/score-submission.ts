import { roundDurationMs } from './constants'
import type { ModSet } from './mods'
import { SURVIVAL } from './round-shape'
import type { LocalBestScore } from './types'

export type SubmitScorePayload = LocalBestScore & { elapsedMs: number; mods?: ModSet }

export type SubmitScoreFn = (input: { data: SubmitScorePayload }) => Promise<{ scoreId: string }>

export type RejectionReason = 'too-short' | 'strict-died-early'

export type SubmissionOutcome =
  | { kind: 'anon' }
  | { kind: 'saved'; scoreId: string }
  | { kind: 'error'; httpStatus?: number; cause: unknown }
  | { kind: 'rejected'; reason: RejectionReason }

// Pure, side-effect-isolated wrapper around the score-submission decision.
// Anonymous runs short-circuit before any network call. Authenticated runs
// invoke `submitScore` once and translate success/failure into a tagged
// outcome that the route layer maps onto its own setters/toast/UI state.
export async function submitFinishedRun(args: {
  result: LocalBestScore
  elapsedMs: number
  isAuthed: boolean
  submitScore: SubmitScoreFn
  mods?: ModSet
}): Promise<SubmissionOutcome> {
  const { result, elapsedMs, isAuthed, submitScore, mods } = args

  if (!isAuthed) {
    return { kind: 'anon' }
  }

  // Validity gate: short / unfinished runs don't write to the leaderboard.
  // Local result still shows; the route layer surfaces a toast on rejection.
  if (result.roundShape === 'survival' && elapsedMs < SURVIVAL.warmupMs) {
    return { kind: 'rejected', reason: 'too-short' }
  }
  if (
    result.roundShape === 'timed' &&
    result.mode === 'custom' &&
    mods?.strict === true &&
    elapsedMs < roundDurationMs
  ) {
    return { kind: 'rejected', reason: 'strict-died-early' }
  }

  try {
    // Server schema demands int().positive(); performance.now() yields floats.
    const payload: SubmitScorePayload = {
      ...result,
      elapsedMs: Math.max(0, Math.round(elapsedMs)),
    }
    if (mods && result.mode === 'custom') payload.mods = mods
    const res = await submitScore({ data: payload })
    return { kind: 'saved', scoreId: res.scoreId }
  } catch (cause) {
    const httpStatus = (cause as { status?: number } | null)?.status
    return { kind: 'error', httpStatus, cause }
  }
}

export function describeRejection(reason: RejectionReason): string {
  if (reason === 'too-short') {
    return 'Run too short — leaderboard skipped.'
  }
  return 'Strict death before timer — leaderboard skipped.'
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
