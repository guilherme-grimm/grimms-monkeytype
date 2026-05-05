import type { LocalBestScore } from '#/lib/game/types'

export async function submitScoreServerFn(input: {
  data: LocalBestScore & {
    elapsedMs: number
  }
}) {
  const { data } = input

  const response = await fetch('/api/scores', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      language: data.language,
      mode: 'standard',
      correctChars: data.correctChars,
      incorrectChars: data.incorrectChars,
      snippetsCompleted: data.snippetsCompleted,
      elapsedMs: data.elapsedMs,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to submit score')
  }

  return response.json()
}
