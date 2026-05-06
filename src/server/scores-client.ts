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
      mode: data.mode,
      correctChars: data.correctChars,
      incorrectChars: data.incorrectChars,
      snippetsCompleted: data.snippetsCompleted,
      elapsedMs: data.elapsedMs,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const error = new Error(
      `Score submit failed (${response.status}): ${body || response.statusText}`,
    ) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  return response.json()
}
