import { randomUUID } from 'node:crypto'

import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { roundDurationMs } from '#/lib/game/constants'
import { DEFAULT_DIFFICULTY, difficultyPresets } from '#/lib/game/difficulty'
import { DEFAULT_MODS, type ModSet } from '#/lib/game/mods'
import { DEFAULT_ROUND_SHAPE, type RoundShape, SURVIVAL } from '#/lib/game/round-shape'
import { calculateRoundMetrics } from '#/lib/game/scoring'
import { languages } from '#/lib/game/types'

import { bestScore, score } from './auth-schema'
import { db } from './db'

const modsSchema = z.object({
  autoSkipNewlines: z.boolean(),
  indentMode: z.enum(['auto', 'tab-helper', 'literal']),
  strict: z.boolean(),
  punctuation: z.boolean(),
  numbers: z.boolean(),
  caseSensitive: z.boolean(),
})

export const submitScoreSchema = z
  .object({
    language: z.enum(languages),
    mode: z.enum(difficultyPresets).default(DEFAULT_DIFFICULTY),
    mods: modsSchema.optional(),
    roundShape: z.enum(['timed', 'survival']).default(DEFAULT_ROUND_SHAPE),
    // Clamped at 1.0 — stops a hostile client from claiming an unbounded
    // bonus. True survival validation needs replay instrumentation; flagged
    // for future. Fine for an honest-client baseline.
    survivalBonus: z.number().nonnegative().max(1.0).default(0),
    correctChars: z.number().int().nonnegative(),
    incorrectChars: z.number().int().nonnegative(),
    snippetsCompleted: z.number().int().nonnegative(),
    elapsedMs: z.number().int().positive(),
  })
  .superRefine((data, ctx) => {
    if (data.roundShape === 'survival' && data.elapsedMs < SURVIVAL.warmupMs) {
      ctx.addIssue({
        code: 'custom',
        path: ['elapsedMs'],
        message: 'survival run shorter than warmup',
      })
    }
    if (
      data.roundShape === 'timed' &&
      data.mode === 'custom' &&
      data.mods?.strict === true &&
      data.elapsedMs < roundDurationMs
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['elapsedMs'],
        message: 'strict-timed run ended before timer',
      })
    }
  })

export type SubmitScoreInput = z.infer<typeof submitScoreSchema>

function shouldReplaceDbBest(
  currentBest:
    | {
        score: number
        accuracy: number
      }
    | undefined,
  nextBest: {
    score: number
    accuracy: number
  },
) {
  if (!currentBest) {
    return true
  }

  if (nextBest.score > currentBest.score) {
    return true
  }

  if (nextBest.score < currentBest.score) {
    return false
  }

  return nextBest.accuracy > currentBest.accuracy
}

export async function submitAuthenticatedScore(userId: string, rawInput: SubmitScoreInput) {
  const input = submitScoreSchema.parse(rawInput)
  // Server is the single source of truth for the multiplier — it derives it
  // from the validated `mode` enum, never accepts a client-provided value.
  // We persist the applied multiplier on the row so future rebalances of
  // presetMultiplier() don't rewrite history.
  const mods: ModSet | undefined =
    input.mode === 'custom' ? (input.mods ?? DEFAULT_MODS) : undefined
  const roundShape: RoundShape = input.roundShape
  const metrics = calculateRoundMetrics({
    correctChars: input.correctChars,
    incorrectChars: input.incorrectChars,
    elapsedMs: input.elapsedMs,
    snippetsCompleted: input.snippetsCompleted,
    mode: input.mode,
    mods,
    roundShape,
    survivalBonus: input.survivalBonus,
  })

  const createdAt = new Date()
  const scoreId = randomUUID()

  await db.insert(score).values({
    id: scoreId,
    userId,
    language: input.language,
    mode: input.mode,
    mods: mods ? JSON.stringify(mods) : null,
    roundShape,
    survivalBonus: metrics.survivalBonus,
    score: metrics.score,
    baseScore: metrics.baseScore,
    multiplier: metrics.multiplier,
    wpm: metrics.wpm,
    cpm: metrics.cpm,
    accuracy: metrics.accuracy,
    correctChars: metrics.correctChars,
    incorrectChars: metrics.incorrectChars,
    totalTypedChars: metrics.totalTypedChars,
    snippetsCompleted: metrics.snippetsCompleted,
    createdAt,
  })

  const currentBest = await db
    .select({
      id: bestScore.id,
      score: score.score,
      accuracy: score.accuracy,
    })
    .from(bestScore)
    .innerJoin(score, eq(bestScore.scoreId, score.id))
    .where(
      and(
        eq(bestScore.userId, userId),
        eq(bestScore.language, input.language),
        eq(bestScore.mode, input.mode),
        eq(bestScore.roundShape, roundShape),
      ),
    )
    .orderBy(desc(score.score), desc(score.accuracy), asc(bestScore.createdAt))
    .limit(1)
    .then((rows) => rows[0])

  const nextBest = { score: metrics.score, accuracy: metrics.accuracy }
  const bestUpdated = shouldReplaceDbBest(currentBest, nextBest)

  if (bestUpdated) {
    if (currentBest) {
      await db
        .update(bestScore)
        .set({ scoreId, updatedAt: createdAt })
        .where(eq(bestScore.id, currentBest.id))
    } else {
      await db.insert(bestScore).values({
        id: randomUUID(),
        userId,
        language: input.language,
        mode: input.mode,
        roundShape,
        scoreId,
        createdAt,
        updatedAt: createdAt,
      })
    }
  }

  return {
    scoreId,
    metrics,
    bestUpdated,
  }
}
