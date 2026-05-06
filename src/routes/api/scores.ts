import { createFileRoute } from '@tanstack/react-router'
import { ZodError } from 'zod'

import { auth } from '#/server/auth'
import { submitAuthenticatedScore } from '#/server/scores'

export const Route = createFileRoute('/api/scores')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session?.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let payload: unknown
        try {
          payload = await request.json()
        } catch (err) {
          console.error('[scores] malformed JSON body', err)
          return Response.json({ error: 'Malformed JSON body' }, { status: 400 })
        }

        try {
          const result = await submitAuthenticatedScore(session.user.id, payload as never)
          return Response.json(result)
        } catch (err) {
          if (err instanceof ZodError) {
            console.error('[scores] payload validation failed', err.issues)
            return Response.json(
              { error: 'Invalid score payload', issues: err.issues },
              { status: 422 },
            )
          }
          console.error('[scores] insert failed', err)
          return Response.json({ error: 'Internal error saving score' }, { status: 500 })
        }
      },
    },
  },
})
