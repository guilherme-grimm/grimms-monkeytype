import type { NormalizedSnippet } from './types'

export function getLeadingIndentWidth(snippet: NormalizedSnippet, activeScoringIndex: number) {
  if (
    activeScoringIndex >= snippet.normalized.length ||
    snippet.normalized[activeScoringIndex] !== ' '
  ) {
    return 0
  }

  const tokenIndex = snippet.displayTokens.findIndex(
    (token) => token.scoringIndex === activeScoringIndex,
  )

  if (tokenIndex === -1) {
    return 0
  }

  for (let index = tokenIndex - 1; index >= 0; index -= 1) {
    const token = snippet.displayTokens[index]

    if (token.value === '\r') {
      continue
    }

    if (token.value === '\n') {
      break
    }

    if (token.scoringIndex !== null) {
      return 0
    }
  }

  let width = 0

  for (let index = tokenIndex; index < snippet.displayTokens.length; index += 1) {
    const token = snippet.displayTokens[index]

    if (token.scoringIndex === null) {
      if (token.value === '\n') {
        break
      }

      continue
    }

    if (token.value !== ' ') {
      break
    }

    width += 1
  }

  return width
}
