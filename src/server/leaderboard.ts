import { asc, desc, eq } from 'drizzle-orm'

import type { DifficultyPreset } from '#/lib/game/difficulty'
import { languages, type LanguageId } from '#/lib/game/types'

import { bestScore, score, user } from './auth-schema'
import { db } from './db'

export type LeaderboardEntry = {
  userId: string
  userName: string
  userImage: string | null
  language: LanguageId
  mode: DifficultyPreset
  score: number
  baseScore: number
  multiplier: number
  accuracy: number
  wpm: number
  snippetsCompleted: number
  achievedAt: Date
}

// One row per (userId, language, mode) in best_score, so a user may have up to
// `difficultyPresets.length` candidates per language. Fetching a multiple of
// the requested limit and deduping by userId keeps each player at their
// single highest run across modes (which is what the multiplier system is
// designed to surface — Hard runs naturally rank higher).
const MODE_FANOUT = 3

function dedupeByUser(rows: Array<LeaderboardEntry>, limit: number) {
  const seen = new Set<string>()
  const result: Array<LeaderboardEntry> = []
  for (const row of rows) {
    if (seen.has(row.userId)) continue
    seen.add(row.userId)
    result.push(row)
    if (result.length >= limit) break
  }
  return result
}

const projection = {
  userId: user.id,
  userName: user.name,
  userImage: user.image,
  language: bestScore.language,
  mode: bestScore.mode,
  score: score.score,
  baseScore: score.baseScore,
  multiplier: score.multiplier,
  accuracy: score.accuracy,
  wpm: score.wpm,
  snippetsCompleted: score.snippetsCompleted,
  achievedAt: bestScore.createdAt,
}

export async function getLeaderboardPreview(limit = 5) {
  const entries = await Promise.all(
    languages.map(async (language) => {
      const rows = await db
        .select(projection)
        .from(bestScore)
        .innerJoin(user, eq(bestScore.userId, user.id))
        .innerJoin(score, eq(bestScore.scoreId, score.id))
        .where(eq(bestScore.language, language))
        .orderBy(desc(score.score), desc(score.accuracy), asc(bestScore.createdAt))
        .limit(limit * MODE_FANOUT)

      const deduped = dedupeByUser(rows as Array<LeaderboardEntry>, limit)
      return [language, deduped] as const
    }),
  )

  return Object.fromEntries(entries) as Record<LanguageId, Array<LeaderboardEntry>>
}

export async function getLeaderboardByLanguage(language: LanguageId, limit = 25) {
  const rows = await db
    .select(projection)
    .from(bestScore)
    .innerJoin(user, eq(bestScore.userId, user.id))
    .innerJoin(score, eq(bestScore.scoreId, score.id))
    .where(eq(bestScore.language, language))
    .orderBy(desc(score.score), desc(score.accuracy), asc(bestScore.createdAt))
    .limit(limit * MODE_FANOUT)

  return dedupeByUser(rows as Array<LeaderboardEntry>, limit)
}

// Hardcap on the rank scan — well above any realistic player count for this
// app, but bounded so a runaway DB can't trigger a giant query.
const RANK_SCAN_CAP = 2000

export type UserRank = {
  rank: number
  entry: LeaderboardEntry
}

// Returns the user's best entry for `language` plus their global rank, using
// the same ordering + dedupe rules as `getLeaderboardByLanguage`. Rank is
// 1-indexed. Null if the user has no scored runs in this language.
export async function getUserBestRank(
  userId: string,
  language: LanguageId,
): Promise<UserRank | null> {
  const rows = await db
    .select(projection)
    .from(bestScore)
    .innerJoin(user, eq(bestScore.userId, user.id))
    .innerJoin(score, eq(bestScore.scoreId, score.id))
    .where(eq(bestScore.language, language))
    .orderBy(desc(score.score), desc(score.accuracy), asc(bestScore.createdAt))
    .limit(RANK_SCAN_CAP)

  const deduped = dedupeByUser(rows as Array<LeaderboardEntry>, RANK_SCAN_CAP)
  const index = deduped.findIndex((entry) => entry.userId === userId)
  if (index === -1) return null
  return { rank: index + 1, entry: deduped[index] }
}
