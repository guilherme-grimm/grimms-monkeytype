import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

import * as schema from './auth-schema'

const databasePath = process.env.DATABASE_PATH ?? './data/app.db'

if (!databasePath.startsWith(':memory:')) {
  mkdirSync(dirname(databasePath), { recursive: true })
}

const client = createClient({ url: `file:${databasePath}` })

await client.execute('PRAGMA journal_mode = WAL;')
await client.execute('PRAGMA foreign_keys = ON;')

export const db = drizzle(client, { schema })
