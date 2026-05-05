import type { Config } from 'drizzle-kit'

export default {
  schema: './src/server/auth-schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: `file:${process.env.DATABASE_PATH ?? './data/app.db'}`,
  },
} satisfies Config
