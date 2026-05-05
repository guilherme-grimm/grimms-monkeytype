import type { DisplayToken, LanguageId, NormalizedSnippet, Snippet } from './types'

export function isSupportedLanguage(value: unknown): value is LanguageId {
  return value === 'javascript' || value === 'typescript' || value === 'python' || value === 'go' || value === 'java'
}

export function sanitizeTypedValue(value: string) {
  return value.replace(/[\r\n\t]/g, '')
}

export function normalizeSource(source: string) {
  return sanitizeTypedValue(source)
}

export function buildDisplayTokens(source: string): Array<DisplayToken> {
  const displayTokens: Array<DisplayToken> = []
  let scoringIndex = 0

  for (const char of source) {
    if (char === '\r' || char === '\n' || char === '\t') {
      displayTokens.push({ value: char, scoringIndex: null })
      continue
    }

    displayTokens.push({ value: char, scoringIndex })
    scoringIndex += 1
  }

  return displayTokens
}

export function normalizeSnippet(snippet: Snippet): NormalizedSnippet {
  return {
    ...snippet,
    normalized: normalizeSource(snippet.source),
    displayTokens: buildDisplayTokens(snippet.source),
  }
}
