import type { LanguageId, Snippet } from './types'
import { languages } from './types'

const snippetModules = import.meta.glob<{ default: Array<Snippet> }>('../../../snippets/*.json', {
  eager: true,
})

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

// Pick a random snippet from the language pool, excluding any IDs the caller
// just played. Falls back to the full pool if the exclusion list eats every
// candidate (e.g. tiny pools, or after a series of resets).
export function getRandomSnippet(
  language: LanguageId,
  excludeIds: ReadonlyArray<string> = [],
): Snippet {
  const all = rawSnippets[language]
  const candidates =
    excludeIds.length === 0 ? all : all.filter((snippet) => !excludeIds.includes(snippet.id))
  const pool = candidates.length > 0 ? candidates : all
  return pool[Math.floor(Math.random() * pool.length)]
}

// Stable first-snippet pick — same on server and client (no Math.random,
// no hydration mismatch), but varies daily and per language so users don't
// type the same opening snippet on repeat. After this first snippet, the
// hook switches to fully random with last-3 exclusion.
//
// Why not pure random here? React state initialization runs during SSR and
// then again on the client; if those two runs disagree, we either get a
// hydration mismatch warning or a visible content flash as the client
// re-renders with its own random pick. Day-based indexing dodges both.
function hashLanguage(language: string) {
  let hash = 0
  for (let index = 0; index < language.length; index += 1) {
    hash = (hash * 31 + language.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

// Sentinel snippet used as the "upcoming" placeholder before a real pick has
// landed (first mount, language switch). SnippetDisplay detects this id and
// renders a skeleton instead of trying to display the empty source. Has its
// own non-language id so it never collides with a real snippet, and so the
// `key={currentSnippet.id}` remount on advance is guaranteed to fire.
export const SKELETON_SNIPPET_ID = '__skeleton__'

export function makeSkeletonSnippet(language: LanguageId): Snippet {
  return { id: SKELETON_SNIPPET_ID, language, source: '' }
}

export function isSkeletonSnippet(snippet: Snippet): boolean {
  return snippet.id === SKELETON_SNIPPET_ID
}

export function getDailyStarter(language: LanguageId): Snippet {
  const pool = rawSnippets[language]
  if (pool.length === 0) return pool[0]
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  const offset = (dayIndex + hashLanguage(language)) % pool.length
  return pool[offset]
}

// Random initial snippet — call this from effects/handlers, never during
// render directly (would hydration-mismatch).
export function getInitialSnippet(language: LanguageId): Snippet {
  return getRandomSnippet(language)
}

// Random next snippet, excluding whatever the caller just played plus any
// recent history they want to avoid repeating.
export function getFollowingSnippet(
  language: LanguageId,
  excludeIds: ReadonlyArray<string>,
): Snippet {
  return getRandomSnippet(language, excludeIds)
}
