import { describe, expect, test } from 'vitest'

import { getCurrentWordIndex, getWordRanges, getWordRegion } from './word-regions'

describe('getWordRanges', () => {
  test('returns empty for empty string', () => {
    expect(getWordRanges('')).toEqual([])
  })

  test('returns empty for whitespace only', () => {
    expect(getWordRanges('   ')).toEqual([])
  })

  test('splits words separated by spaces', () => {
    expect(getWordRanges('foo bar baz')).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
      { start: 8, end: 11 },
    ])
  })

  test('handles leading and trailing spaces', () => {
    expect(getWordRanges('  foo  ')).toEqual([{ start: 2, end: 5 }])
  })
})

describe('getCurrentWordIndex', () => {
  const ranges = [
    { start: 0, end: 3 },
    { start: 4, end: 7 },
    { start: 8, end: 11 },
  ]

  test('returns -1 for empty ranges', () => {
    expect(getCurrentWordIndex([], 5)).toBe(-1)
  })

  test('returns containing word when active index is inside one', () => {
    expect(getCurrentWordIndex(ranges, 5)).toBe(1)
  })

  test('returns next word when active index is in space between words', () => {
    expect(getCurrentWordIndex(ranges, 3)).toBe(1)
  })

  test('returns last word when active index is past end', () => {
    expect(getCurrentWordIndex(ranges, 99)).toBe(2)
  })
})

describe('getWordRegion', () => {
  // 'foo bar baz qux quux' — 5 words at 0-3, 4-7, 8-11, 12-15, 16-20
  const target = 'foo bar baz qux quux'

  test('returns "future" for empty target', () => {
    expect(getWordRegion('', 0, 0)).toBe('future')
  })

  test('classifies the word containing the caret as current', () => {
    // active inside 'baz' (word index 2)
    expect(getWordRegion(target, 8, 9)).toBe('current')
  })

  test('classifies the word before current as previous', () => {
    // caret in 'baz' (word 2); 'bar' (word 1) is previous
    expect(getWordRegion(target, 4, 9)).toBe('previous')
  })

  test('classifies words two or more behind as past', () => {
    // caret in 'baz' (word 2); 'foo' (word 0) is past
    expect(getWordRegion(target, 0, 9)).toBe('past')
  })

  test('classifies the word after current as next', () => {
    // caret in 'baz' (word 2); 'qux' (word 3) is next
    expect(getWordRegion(target, 12, 9)).toBe('next')
  })

  test('classifies words two or more ahead as future', () => {
    // caret in 'baz' (word 2); 'quux' (word 4) is future
    expect(getWordRegion(target, 16, 9)).toBe('future')
  })

  test('classifies space chars by position relative to caret', () => {
    // index 3 is the space after 'foo'; caret at 9 (in 'baz')
    expect(getWordRegion(target, 3, 9)).toBe('past')
    // index 11 is the space after 'baz'; caret at 0 (in 'foo')
    expect(getWordRegion(target, 11, 0)).toBe('future')
  })
})
