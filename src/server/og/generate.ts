import { mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { Resvg } from '@resvg/resvg-js'
import { eq } from 'drizzle-orm'
import satori from 'satori'

import { rankFor } from '#/lib/game/scoring'

import { score as scoreTable, user } from '../auth-schema'
import { db } from '../db'
import { ogFonts } from './fonts'
import { renderRunCard } from './render'

const databasePath = process.env.DATABASE_PATH ?? './data/app.db'
const cacheDir = process.env.OG_CACHE_DIR ?? join(dirname(databasePath), 'og')
mkdirSync(cacheDir, { recursive: true })

export async function generateOgPng(scoreId: string): Promise<Buffer | null> {
  const cachePath = join(cacheDir, `${scoreId}.png`)

  try {
    return await readFile(cachePath)
  } catch {
    // cache miss — fall through
  }

  const row = await db
    .select({
      score: scoreTable.score,
      wpm: scoreTable.wpm,
      accuracy: scoreTable.accuracy,
      snippetsCompleted: scoreTable.snippetsCompleted,
      language: scoreTable.language,
      mode: scoreTable.mode,
      userName: user.name,
    })
    .from(scoreTable)
    .innerJoin(user, eq(scoreTable.userId, user.id))
    .where(eq(scoreTable.id, scoreId))
    .limit(1)
    .then((rows) => rows[0])

  if (!row) return null

  const svg = await satori(
    renderRunCard({
      rank: rankFor(row.score),
      score: row.score,
      wpm: row.wpm,
      accuracy: row.accuracy,
      snippetsCompleted: row.snippetsCompleted,
      language: row.language,
      mode: row.mode,
      userName: row.userName,
    }),
    {
      width: 1200,
      height: 630,
      fonts: ogFonts,
    },
  )

  const png = new Resvg(svg).render().asPng()
  const buffer = Buffer.from(png)

  writeFile(cachePath, buffer).catch((err) => {
    console.warn(`[og] cache write failed for ${scoreId}:`, err)
  })

  return buffer
}
