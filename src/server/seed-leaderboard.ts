import { randomUUID } from 'node:crypto'

import { eq, inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/libsql/migrator'

import { db } from './db'
import { bestScore, score, user } from './auth-schema'

const sampleUsers = [
  { id: 'seed-user-1', name: 'ZeroCool', email: 'zerocool@local.dev' },
  { id: 'seed-user-2', name: 'AcidBurn', email: 'acidburn@local.dev' },
  { id: 'seed-user-3', name: 'CrashOverride', email: 'crashoverride@local.dev' },
  { id: 'seed-user-4', name: 'ThePlague', email: 'theplague@local.dev' },
  { id: 'seed-user-5', name: 'Trinity', email: 'trinity@local.dev' },
]

const now = new Date()

const sampleScores = [
  { userId: 'seed-user-1', language: 'javascript', score: 214, wpm: 96.4, cpm: 482, accuracy: 98.2, correctChars: 241, incorrectChars: 5, totalTypedChars: 246, snippetsCompleted: 4 },
  { userId: 'seed-user-2', language: 'typescript', score: 226, wpm: 101.8, cpm: 509, accuracy: 99.1, correctChars: 255, incorrectChars: 2, totalTypedChars: 257, snippetsCompleted: 4 },
  { userId: 'seed-user-3', language: 'python', score: 189, wpm: 84.6, cpm: 423, accuracy: 97.5, correctChars: 212, incorrectChars: 6, totalTypedChars: 218, snippetsCompleted: 3 },
  { userId: 'seed-user-4', language: 'go', score: 205, wpm: 91.7, cpm: 459, accuracy: 98.6, correctChars: 230, incorrectChars: 3, totalTypedChars: 233, snippetsCompleted: 4 },
  { userId: 'seed-user-5', language: 'java', score: 178, wpm: 79.1, cpm: 396, accuracy: 96.8, correctChars: 198, incorrectChars: 7, totalTypedChars: 205, snippetsCompleted: 3 },
  { userId: 'seed-user-1', language: 'java', score: 201, wpm: 90.1, cpm: 451, accuracy: 98.1, correctChars: 226, incorrectChars: 4, totalTypedChars: 230, snippetsCompleted: 4 },
  { userId: 'seed-user-2', language: 'go', score: 196, wpm: 87.6, cpm: 438, accuracy: 97.9, correctChars: 219, incorrectChars: 5, totalTypedChars: 224, snippetsCompleted: 4 },
  { userId: 'seed-user-3', language: 'javascript', score: 208, wpm: 93.0, cpm: 465, accuracy: 98.0, correctChars: 233, incorrectChars: 5, totalTypedChars: 238, snippetsCompleted: 4 },
]

async function seed() {
  await migrate(db, { migrationsFolder: './drizzle' })

  await db.insert(user).values(
    sampleUsers.map((entry) => ({
      ...entry,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    })),
  ).onConflictDoNothing()

  const seededUserIds = sampleUsers.map((entry) => entry.id)

  await db.delete(bestScore).where(inArray(bestScore.userId, seededUserIds))

  const existingScores = await db.select({ id: score.id }).from(score).where(inArray(score.userId, seededUserIds))
  if (existingScores.length > 0) {
    await db.delete(score).where(inArray(score.id, existingScores.map((entry) => entry.id)))
  }

  const insertedScores = sampleScores.map((entry, index) => ({
    id: `seed-score-${index + 1}-${randomUUID()}`,
    userId: entry.userId,
    language: entry.language,
    mode: 'standard',
    score: entry.score,
    wpm: entry.wpm,
    cpm: entry.cpm,
    accuracy: entry.accuracy,
    correctChars: entry.correctChars,
    incorrectChars: entry.incorrectChars,
    totalTypedChars: entry.totalTypedChars,
    snippetsCompleted: entry.snippetsCompleted,
    createdAt: now,
  }))

  await db.insert(score).values(insertedScores)

  const bestRows = Object.values(
    insertedScores.reduce<Record<string, (typeof insertedScores)[number]>>((acc, entry) => {
      const key = `${entry.userId}:${entry.language}:${entry.mode}`
      acc[key] = entry
      return acc
    }, {}),
  )

  await db.insert(bestScore).values(
    bestRows.map((entry) => ({
      id: `seed-best-${randomUUID()}`,
      userId: entry.userId,
      language: entry.language,
      mode: entry.mode,
      scoreId: entry.id,
      createdAt: now,
      updatedAt: now,
    })),
  )

  const summary = await db.select({
    userName: user.name,
    language: bestScore.language,
    score: score.score,
    wpm: score.wpm,
    accuracy: score.accuracy,
  })
    .from(bestScore)
    .innerJoin(user, eq(bestScore.userId, user.id))
    .innerJoin(score, eq(bestScore.scoreId, score.id))

  console.table(summary)
}

await seed()
