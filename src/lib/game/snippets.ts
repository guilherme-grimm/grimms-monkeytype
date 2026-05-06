import { languages } from './types'
import type { LanguageId, Snippet } from './types'

const snippetModules = import.meta.glob<{ default: Array<Snippet> }>(
  '../../../data/snippets/*.json',
  { eager: true },
)

function buildSnippetIndex(): Record<LanguageId, Array<Snippet>> {
  const byLanguage = {} as Record<LanguageId, Array<Snippet>>

  for (const language of languages) {
    byLanguage[language] = []
  }

  for (const [path, module] of Object.entries(snippetModules)) {
    const filename = path.split('/').pop() ?? ''
    const language = filename.replace(/\.json$/, '') as LanguageId

    if (!languages.includes(language)) {
      continue
    }

    byLanguage[language] = module.default
  }

  return byLanguage
}

const rawSnippets = buildSnippetIndex()

export function getSnippetsForLanguage(language: LanguageId): Array<Snippet> {
  return rawSnippets[language]
}

export function getInitialSnippet(language: LanguageId): Snippet {
  return rawSnippets[language][0]
}

export function getFollowingSnippet(language: LanguageId, currentSnippetId: string): Snippet {
  const snippets = rawSnippets[language]
  const currentIndex = snippets.findIndex((snippet) => snippet.id === currentSnippetId)

  if (currentIndex === -1) {
    return snippets[0]
  }

  return snippets[(currentIndex + 1) % snippets.length]
}
