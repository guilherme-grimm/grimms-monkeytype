import { describe, expect, test } from 'vitest'

import { buildDisplayTokens, normalizeSource, sanitizeTypedValue } from './normalization'

describe('normalization helpers', () => {
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
