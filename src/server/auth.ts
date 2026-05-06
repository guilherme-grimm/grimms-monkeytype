import { dash } from '@better-auth/infra'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from './db'
import * as schema from './auth-schema'

const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

if (process.env.NODE_ENV === 'production' && baseURL.startsWith('http://localhost')) {
  console.warn(
    '[auth] BETTER_AUTH_URL is unset in production — falling back to http://localhost:3000. ' +
      'OAuth callbacks and cookies will misbehave. Set BETTER_AUTH_URL to the deployed origin.',
  )
}

if (process.env.NODE_ENV === 'production' && !process.env.BETTER_AUTH_SECRET) {
  console.warn('[auth] BETTER_AUTH_SECRET is unset in production. Sessions will not persist correctly.')
}

if (!githubClientId || !githubClientSecret) {
  console.warn('[auth] GitHub OAuth credentials missing — GitHub sign-in will be unavailable.')
}

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [baseURL],
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
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'lax',
    },
  },
  plugins: [dash(), tanstackStartCookies()],
})
