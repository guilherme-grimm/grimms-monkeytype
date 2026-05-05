export type WordRegion = 'past' | 'previous' | 'current' | 'next' | 'future'

export function getWordRanges(normalized: string) {
  const ranges: Array<{ start: number; end: number }> = []
  let index = 0

  while (index < normalized.length) {
    while (index < normalized.length && normalized[index] === ' ') {
      index += 1
    }

    if (index >= normalized.length) {
      break
    }

    const start = index

    while (index < normalized.length && normalized[index] !== ' ') {
      index += 1
    }

    ranges.push({ start, end: index })
  }

  return ranges
}

export function getCurrentWordIndex(ranges: Array<{ start: number; end: number }>, activeIndex: number) {
  if (ranges.length === 0) {
    return -1
  }

  const containingIndex = ranges.findIndex((range) => activeIndex >= range.start && activeIndex < range.end)

  if (containingIndex !== -1) {
    return containingIndex
  }

  const nextIndex = ranges.findIndex((range) => range.start > activeIndex)
  if (nextIndex !== -1) {
    return nextIndex
  }

  return ranges.length - 1
}

export function getWordRegion(normalized: string, scoringIndex: number, activeIndex: number): WordRegion {
  const ranges = getWordRanges(normalized)

  if (ranges.length === 0) {
    return 'future'
  }

  const wordIndex = ranges.findIndex((range) => scoringIndex >= range.start && scoringIndex < range.end)
  if (wordIndex === -1) {
    return scoringIndex < activeIndex ? 'past' : 'future'
  }

  const currentWordIndex = getCurrentWordIndex(ranges, activeIndex)

  if (wordIndex < currentWordIndex - 1) {
    return 'past'
  }

  if (wordIndex === currentWordIndex - 1) {
    return 'previous'
  }

  if (wordIndex === currentWordIndex) {
    return 'current'
  }

  if (wordIndex === currentWordIndex + 1) {
    return 'next'
  }

  return 'future'
}
