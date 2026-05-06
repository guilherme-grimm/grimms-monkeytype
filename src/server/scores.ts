import { randomUUID } from 'node:crypto'

import { and, asc, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { DEFAULT_DIFFICULTY, difficultyPresets } from '#/lib/game/difficulty'
import { calculateRoundMetrics } from '#/lib/game/scoring'
import { languages } from '#/lib/game/types'

import { bestScore, score } from './auth-schema'
import { db } from './db'

export const submitScoreSchema = z.object({
  language: z.enum(languages),
  mode: z.enum(difficultyPresets).default(DEFAULT_DIFFICULTY),
  correctChars: z.number().int().nonnegative(),
  incorrectChars: z.number().int().nonnegative(),
  snippetsCompleted: z.number().int().nonnegative(),
  elapsedMs: z.number().int().positive(),
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
  const metrics = calculateRoundMetrics({
    correctChars: input.correctChars,
    incorrectChars: input.incorrectChars,
    elapsedMs: input.elapsedMs,
    snippetsCompleted: input.snippetsCompleted,
    mode: input.mode,
  })

  const createdAt = new Date()
  const scoreId = randomUUID()

  await db.insert(score).values({
    id: scoreId,
    userId,
    language: input.language,
    mode: input.mode,
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
    .where(and(eq(bestScore.userId, userId), eq(bestScore.language, input.language), eq(bestScore.mode, input.mode)))
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
        scoreId,
        createdAt,
        updatedAt: createdAt,
      })
    }
  }

  return {
    metrics,
    bestUpdated,
  }
}
