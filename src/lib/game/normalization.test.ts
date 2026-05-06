import { describe, expect, test } from 'vitest'

import { presetToFlags } from './difficulty'
import { buildDisplayTokens, normalizeSource, sanitizeTypedValue } from './normalization'

describe('normalization helpers (default = normal preset)', () => {
  test('removes tabs and line breaks but preserves spaces', () => {
    expect(normalizeSource('if (x) {\n\treturn y\r\n}')).toBe('if (x) {return y}')
    expect(sanitizeTypedValue('a b\n\tc')).toBe('a bc')
  })

  test('marks ignored display tokens without scoring indexes', () => {
    expect(buildDisplayTokens('a\n\tb')).toEqual([
      { value: 'a', scoringIndex: 0 },
      { value: '\n', scoringIndex: null },
      { value: '\t', scoringIndex: null },
      { value: 'b', scoringIndex: 1 },
    ])
  })
})

describe('normalization across difficulty presets', () => {
  const easy = presetToFlags('easy')
  const normal = presetToFlags('normal')
  const hard = presetToFlags('hard')

  const sample = 'if {\n  return y\n}'

  test('easy strips leading indent of every line', () => {
    expect(normalizeSource(sample, easy)).toBe('if {return y}')
  })

  test('normal keeps inline spaces and strips newlines (today\'s behavior)', () => {
    expect(normalizeSource(sample, normal)).toBe('if {  return y}')
  })

  test('hard preserves newlines and indent, only strips tabs', () => {
    expect(normalizeSource(sample, hard)).toBe(sample)
    expect(normalizeSource('a\tb\nc', hard)).toBe('ab\nc')
  })

  test('sanitizeTypedValue keeps newlines in hard mode but always strips tabs', () => {
    expect(sanitizeTypedValue('a\nb\tc', hard)).toBe('a\nbc')
    expect(sanitizeTypedValue('a\nb\tc', normal)).toBe('abc')
  })

  test('easy gives leading spaces a null scoringIndex', () => {
    const tokens = buildDisplayTokens('a\n  b', easy)
    expect(tokens).toEqual([
      { value: 'a', scoringIndex: 0 },
      { value: '\n', scoringIndex: null },
      { value: ' ', scoringIndex: null },
      { value: ' ', scoringIndex: null },
      { value: 'b', scoringIndex: 1 },
    ])
  })

  test('hard gives newlines a real scoringIndex', () => {
    const tokens = buildDisplayTokens('a\nb', hard)
    expect(tokens).toEqual([
      { value: 'a', scoringIndex: 0 },
      { value: '\n', scoringIndex: 1 },
      { value: 'b', scoringIndex: 2 },
    ])
  })
})
