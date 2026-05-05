import { describe, expect, test } from 'vitest'

import { getLeadingIndentWidth } from './indentation'
import { normalizeSnippet } from './normalization'
import type { Snippet } from './types'

function snippet(source: string): ReturnType<typeof normalizeSnippet> {
  const raw: Snippet = { id: 'test', language: 'javascript', source }
  return normalizeSnippet(raw)
}

describe('getLeadingIndentWidth', () => {
  test('returns 0 when active char is not a space', () => {
    const s = snippet('foo')
    expect(getLeadingIndentWidth(s, 0)).toBe(0)
  })

  test('returns 0 when active index is past end', () => {
    const s = snippet('foo')
    expect(getLeadingIndentWidth(s, 999)).toBe(0)
  })

  test('returns indent width at start of indented line', () => {
    // line 1: "x", newline, line 2: "  y" (2-space indent before 'y')
    const s = snippet('x\n  y')
    // scoringIndex 0='x', 1=' ', 2=' ', 3='y'
    expect(getLeadingIndentWidth(s, 1)).toBe(2)
  })

  test('returns 0 when space is mid-line (after non-space content)', () => {
    const s = snippet('a b c')
    // scoringIndex 1 is the space after 'a'
    expect(getLeadingIndentWidth(s, 1)).toBe(0)
  })

  test('counts only contiguous leading spaces, stops at first non-space', () => {
    const s = snippet('a\n    b c')
    // 4-space indent before 'b'; the space between b and c should not extend the width
    // scoringIndex: 0='a', 1=' ',2=' ',3=' ',4=' ', 5='b', 6=' ', 7='c'
    expect(getLeadingIndentWidth(s, 1)).toBe(4)
  })

  test('handles tab as visual-only token before indent spaces', () => {
    // "\n\t  y": newline, tab (non-scoring), then two spaces, then y
    // scoringIndex 0=' ', 1=' ', 2='y'
    const s = snippet('\n\t  y')
    expect(getLeadingIndentWidth(s, 0)).toBe(2)
  })

  test('returns 0 when leading position is at index 0 of first line with content', () => {
    // First line starts with spaces — should be a valid indent region.
    const s = snippet('  y')
    expect(getLeadingIndentWidth(s, 0)).toBe(2)
  })
})
