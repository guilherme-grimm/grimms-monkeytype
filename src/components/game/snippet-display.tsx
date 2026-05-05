import { useLayoutEffect, useRef, useState } from 'react'

import type { NormalizedSnippet } from '#/lib/game/types'

type SnippetDisplayProps = {
  currentSnippet: NormalizedSnippet
  upcomingSnippet: NormalizedSnippet
  typedValue: string
}

type WordRegion = 'past' | 'previous' | 'current' | 'next' | 'future'

function renderIgnoredToken(tokenValue: string, key: string) {
  if (tokenValue === '\r') {
    return null
  }

  if (tokenValue === '\n') {
    return <span key={key}>{'\n'}</span>
  }

  if (tokenValue === '\t') {
    return (
      <span key={key} className="snippet-indent">
        {'····'}
      </span>
    )
  }

  return <span key={key}>{tokenValue}</span>
}

function getSpaceGlyph(isCurrent: boolean, isTyped: boolean) {
  return isCurrent || isTyped ? '·' : '·'
}

function getWordRanges(normalized: string) {
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

function getCurrentWordIndex(ranges: Array<{ start: number; end: number }>, activeIndex: number) {
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

function getWordRegion(normalized: string, scoringIndex: number, activeIndex: number): WordRegion {
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

function getWordRegionClass(region: WordRegion) {
  switch (region) {
    case 'previous':
      return 'snippet-word-previous'
    case 'current':
      return 'snippet-word-current'
    case 'next':
      return 'snippet-word-next'
    case 'past':
      return 'snippet-word-past'
    default:
      return 'snippet-word-future'
  }
}

export function SnippetDisplay({ currentSnippet, upcomingSnippet, typedValue }: SnippetDisplayProps) {
  const activeIndex = typedValue.length
  const overflow = activeIndex > currentSnippet.normalized.length ? typedValue.slice(currentSnippet.normalized.length) : ''
  const containerRef = useRef<HTMLDivElement | null>(null)
  const currentSnippetRef = useRef<HTMLPreElement | null>(null)
  const characterRefs = useRef<Record<number, HTMLSpanElement | null>>({})
  const [caretStyle, setCaretStyle] = useState({
    x: 0,
    y: 0,
    height: 28,
    visible: false,
  })

  function getForwardAnchorElement() {
    if (activeIndex >= currentSnippet.normalized.length) {
      return null
    }

    for (let index = activeIndex; index < currentSnippet.normalized.length; index += 1) {
      if (currentSnippet.normalized[index] !== ' ') {
        return characterRefs.current[index] ?? null
      }
    }

    return null
  }

  useLayoutEffect(() => {
    const currentSnippetElement = currentSnippetRef.current

    if (!currentSnippetElement) {
      return
    }

    const activeElement = characterRefs.current[activeIndex]
    const fallbackElement = characterRefs.current[Math.max(0, activeIndex - 1)]
    const anchorElement = activeElement ?? fallbackElement
    const forwardAnchorElement = getForwardAnchorElement()

    if (!anchorElement) {
      return
    }

    const isAtEnd = !activeElement && activeIndex > 0
    const anchorOffsetLeft = anchorElement.offsetLeft
    const anchorOffsetRight = anchorOffsetLeft + anchorElement.offsetWidth
    const activeChar = currentSnippet.normalized[activeIndex]
    const useForwardAnchor = activeChar === ' ' && forwardAnchorElement !== null
    const followAnchorLeft = useForwardAnchor ? forwardAnchorElement.offsetLeft : anchorOffsetLeft
    const followAnchorRight = useForwardAnchor
      ? forwardAnchorElement.offsetLeft + forwardAnchorElement.offsetWidth
      : anchorOffsetRight
    const caretLeftInSnippet = isAtEnd ? anchorOffsetRight : anchorOffsetLeft
    const caretRightInSnippet = anchorOffsetRight
    const lookBehindPadding = 96
    const lookAheadPadding = 196
    const hysteresis = 48
    const visibleLeft = currentSnippetElement.scrollLeft
    const visibleRight = visibleLeft + currentSnippetElement.clientWidth
    const leftBoundary = visibleLeft + lookBehindPadding
    const rightBoundary = visibleRight - 96

    let nextScrollLeft = visibleLeft

    if (followAnchorRight > rightBoundary) {
      nextScrollLeft = Math.max(0, followAnchorRight - currentSnippetElement.clientWidth + lookAheadPadding - hysteresis)
    } else if (caretLeftInSnippet < leftBoundary) {
      nextScrollLeft = Math.max(0, followAnchorLeft - lookBehindPadding + hysteresis)
    }

    if (nextScrollLeft !== visibleLeft) {
      currentSnippetElement.scrollLeft = nextScrollLeft
    }
  }, [activeIndex, currentSnippet.id, typedValue])

  useLayoutEffect(() => {
    const container = containerRef.current
    const currentSnippetElement = currentSnippetRef.current

    if (!container || !currentSnippetElement) {
      return
    }

    const activeElement = characterRefs.current[activeIndex]
    const fallbackElement = characterRefs.current[Math.max(0, activeIndex - 1)]
    const anchorElement = activeElement ?? fallbackElement

    if (!anchorElement) {
      setCaretStyle((value) => ({ ...value, visible: false }))
      return
    }

    const containerRect = container.getBoundingClientRect()
    const anchorRect = anchorElement.getBoundingClientRect()
    const isAtEnd = !activeElement && activeIndex > 0

    setCaretStyle({
      x: (isAtEnd ? anchorRect.right : anchorRect.left) - containerRect.left - (isAtEnd ? 0 : 2),
      y: anchorRect.top - containerRect.top,
      height: anchorRect.height,
      visible: true,
    })
  }, [activeIndex, currentSnippet.id, typedValue])

  useLayoutEffect(() => {
    if (currentSnippetRef.current) {
      currentSnippetRef.current.scrollLeft = 0
    }
  }, [currentSnippet.id])

  return (
    <div ref={containerRef} className="snippet-display relative space-y-4">
      <div
        aria-hidden="true"
        className="typing-caret"
        style={{
          transform: `translate(${caretStyle.x}px, ${caretStyle.y}px)`,
          height: `${caretStyle.height}px`,
          opacity: caretStyle.visible ? 1 : 0,
        }}
      />

      <pre ref={currentSnippetRef} className="snippet-current overflow-x-auto whitespace-pre">
        {currentSnippet.displayTokens.map((token, index) => {
          if (token.scoringIndex === null) {
            return renderIgnoredToken(token.value, `${currentSnippet.id}-${index}`)
          }

          const scoringIndex = token.scoringIndex
          const typedChar = typedValue[scoringIndex]
          const targetChar = currentSnippet.normalized[scoringIndex]
          const isCurrent = scoringIndex === activeIndex
          const isSpace = targetChar === ' '
          const wordRegion = getWordRegion(currentSnippet.normalized, scoringIndex, activeIndex)
          let className = getWordRegionClass(wordRegion)

          if (typedChar === undefined) {
            className = isCurrent
              ? 'snippet-char snippet-char-current'
              : getWordRegionClass(wordRegion)
          } else if (typedChar === targetChar) {
            className = wordRegion === 'past' ? 'snippet-word-past-typed' : 'text-[var(--color-text)]'
          } else {
            className = 'snippet-char snippet-char-error'
          }

          if (isSpace && typedChar === undefined && !isCurrent) {
            className = 'snippet-space'
          }

          if (isSpace && typedChar === targetChar) {
            className = 'snippet-space snippet-space-correct'
          }

          if (isSpace && isCurrent) {
            className = typedChar === undefined ? 'snippet-char snippet-char-current snippet-space' : className
          }

          return (
            <span key={`${currentSnippet.id}-${index}`} className={className}>
              <span
                ref={(element) => {
                  characterRefs.current[scoringIndex] = element
                }}
              >
                {isSpace ? getSpaceGlyph(isCurrent, typedChar !== undefined) : token.value}
              </span>
            </span>
          )
        })}

        {overflow.length > 0 ? (
          <span className="snippet-char snippet-char-error">
            {overflow.replaceAll(' ', '·')}
          </span>
        ) : null}
      </pre>

      <div className="h-px w-full bg-white/8" />

      <pre className="snippet-upcoming overflow-x-auto whitespace-pre">
        {upcomingSnippet.displayTokens.map((token, index) => {
          if (token.scoringIndex === null) {
            return renderIgnoredToken(token.value, `${upcomingSnippet.id}-${index}`)
          }

          return <span key={`${upcomingSnippet.id}-${index}`}>{token.value === ' ' ? '·' : token.value}</span>
        })}
      </pre>

      <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]/75">
        current snippet above, next snippet queued below
      </p>
    </div>
  )
}
