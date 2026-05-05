import { createFileRoute } from '@tanstack/react-router'

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

        const payload = await request.json()
        const result = await submitAuthenticatedScore(session.user.id, payload)

        return Response.json(result)
      },
    },
  },
})
