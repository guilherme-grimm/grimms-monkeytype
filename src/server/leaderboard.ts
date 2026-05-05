import { and, asc, desc, eq } from 'drizzle-orm'

import { languages, type LanguageId } from '#/lib/game/types'

import { bestScore, score, user } from './auth-schema'
import { db } from './db'

export type LeaderboardEntry = {
  userId: string
  userName: string
  userImage: string | null
  language: LanguageId
  score: number
  accuracy: number
  wpm: number
  snippetsCompleted: number
  achievedAt: Date
}

export async function getLeaderboardPreview(limit = 5) {
  const entries = await Promise.all(
    languages.map(async (language) => {
      const rows = await db
        .select({
          userId: user.id,
          userName: user.name,
          userImage: user.image,
          language: bestScore.language,
          score: score.score,
          accuracy: score.accuracy,
          wpm: score.wpm,
          snippetsCompleted: score.snippetsCompleted,
          achievedAt: bestScore.createdAt,
        })
        .from(bestScore)
        .innerJoin(user, eq(bestScore.userId, user.id))
        .innerJoin(score, eq(bestScore.scoreId, score.id))
        .where(and(eq(bestScore.language, language), eq(bestScore.mode, 'standard')))
        .orderBy(desc(score.score), desc(score.accuracy), asc(bestScore.createdAt))
        .limit(limit)

      return [language, rows as Array<LeaderboardEntry>] as const
    }),
  )

  return Object.fromEntries(entries) as Record<LanguageId, Array<LeaderboardEntry>>
}

export async function getLeaderboardByLanguage(language: LanguageId, limit = 25) {
  const rows = await db
    .select({
      userId: user.id,
      userName: user.name,
      userImage: user.image,
      language: bestScore.language,
      score: score.score,
      accuracy: score.accuracy,
      wpm: score.wpm,
      snippetsCompleted: score.snippetsCompleted,
      achievedAt: bestScore.createdAt,
    })
    .from(bestScore)
    .innerJoin(user, eq(bestScore.userId, user.id))
    .innerJoin(score, eq(bestScore.scoreId, score.id))
    .where(and(eq(bestScore.language, language), eq(bestScore.mode, 'standard')))
    .orderBy(desc(score.score), desc(score.accuracy), asc(bestScore.createdAt))
    .limit(limit)

  return rows as Array<LeaderboardEntry>
}
