import { describe, expect, test } from 'vitest'

import { getSnippetsForLanguage } from './snippets'
import { languages } from './types'

describe('snippet catalog', () => {
  test('has playable snippets for every supported language', () => {
    for (const language of languages) {
      const snippets = getSnippetsForLanguage(language)

      expect(snippets.length, `${language} should have snippets`).toBeGreaterThan(0)

      for (const snippet of snippets) {
        expect(snippet.language).toBe(language)
        expect(snippet.id.trim().length).toBeGreaterThan(0)
        expect(snippet.source.trim().length).toBeGreaterThan(0)
        expect(snippet.source).not.toContain('\t')

        for (const line of snippet.source.split('\n')) {
          expect(line.endsWith(' '), `${snippet.id} has trailing whitespace`).toBe(false)
        }
      }
    }
  })

  test('includes C and C++ snippet pools with stable IDs and four-space indentation', () => {
    for (const language of ['c', 'cpp'] as const) {
      const snippets = getSnippetsForLanguage(language)

      expect(snippets).not.toHaveLength(0)
      for (const snippet of snippets) {
        expect(snippet.id.startsWith(`${language}-`)).toBe(true)

        for (const line of snippet.source.split('\n')) {
          const indent = line.match(/^ */)?.[0] ?? ''
          expect(indent.length % 4, `${snippet.id} has non-four-space indentation`).toBe(0)
        }
      }
    }
  })
})
