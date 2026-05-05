import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: typeof window === 'undefined' ? process.env.BETTER_AUTH_URL : undefined,
})

export const { signIn, signOut, useSession } = authClient
