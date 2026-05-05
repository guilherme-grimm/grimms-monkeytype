import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from './db'
import * as schema from './auth-schema'

const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    ...(githubClientId && githubClientSecret
      ? { github: { clientId: githubClientId, clientSecret: githubClientSecret } }
      : {}),
  },
  plugins: [tanstackStartCookies()],
})
