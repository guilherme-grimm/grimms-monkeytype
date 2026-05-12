// Round shape — the "how does a round end" axis. Orthogonal to difficulty
// preset and mods (which control "how is each keystroke scored").
//
// Timed: 30s hard cap, ends on timer.
// Survival: warmup phase identical to timed; once past warmup the meter
// starts and a single mistake or empty meter ends the run. Streak keystrokes
// refill fuel; sustained streaks compound the multiplier in 0.001 steps.
export type RoundShape = 'timed' | 'survival'

export const DEFAULT_ROUND_SHAPE: RoundShape = 'timed'

export const roundShapes = ['timed', 'survival'] as const

export function isRoundShape(value: unknown): value is RoundShape {
  return value === 'timed' || value === 'survival'
}

export const SURVIVAL = {
  // Warmup mirrors the timed round duration so the early game feels familiar.
  // After this elapsed window the meter spawns full and the round becomes
  // endless-or-die.
  warmupMs: 25_000,
  // Initial + max meter capacity. ~1.5s of grace if you stop typing.
  meterCapMs: 1500,
  // Drain rate while the meter is active. 1ms drain per 1ms of wall clock.
  drainPerMs: 1,
  // Refill per correct streak keystroke. 0.05ms per char means a fast typist
  // (~300 cpm = 5 cps) banks ~0.25ms/sec — slower than drain, so the meter
  // is a pressure mechanic, not a soft cap.
  gainPerStreakKeystroke: 0.05,
  // Total accumulated gain (NOT current meter) needed to bump the multiplier
  // by one step. Resets the threshold counter forward; survives the run.
  multiplierStepThresholdMs: 100,
  multiplierStep: 0.001,
} as const

// Pure: given total gained ms across the run, how many multiplier steps
// have been crossed. Survives floating noise — caller multiplies by
// multiplierStep to get the bonus added to the base multiplier.
export function survivalThresholdsCrossed(totalGainedMs: number): number {
  if (totalGainedMs <= 0) return 0
  return Math.floor(totalGainedMs / SURVIVAL.multiplierStepThresholdMs)
}

export function survivalBonusFromGain(totalGainedMs: number): number {
  return survivalThresholdsCrossed(totalGainedMs) * SURVIVAL.multiplierStep
}
