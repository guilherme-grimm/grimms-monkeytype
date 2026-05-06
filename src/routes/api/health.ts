import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'

import { db } from '#/server/db'
import { user, score } from '#/server/auth-schema'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const [userRow] = await db.select({ count: sql<number>`count(*)` }).from(user)
          const [scoreRow] = await db.select({ count: sql<number>`count(*)` }).from(score)

          return Response.json({
            db: 'ok',
            users: Number(userRow?.count ?? 0),
            scores: Number(scoreRow?.count ?? 0),
            baseURL: process.env.BETTER_AUTH_URL ?? null,
            env: process.env.NODE_ENV ?? 'unknown',
            databasePath: process.env.DATABASE_PATH ?? null,
          })
        } catch (err) {
          console.error('[health] db check failed', err)
          return Response.json(
            {
              db: 'error',
              error: err instanceof Error ? err.message : 'unknown',
              baseURL: process.env.BETTER_AUTH_URL ?? null,
              env: process.env.NODE_ENV ?? 'unknown',
            },
            { status: 503 },
          )
        }
      },
    },
  },
})
