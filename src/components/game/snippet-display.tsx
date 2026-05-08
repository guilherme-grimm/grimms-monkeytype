import { useLayoutEffect, useRef, useState } from 'react'

import { SKELETON_SNIPPET_ID } from '#/lib/game/snippets'
import type { NormalizedSnippet } from '#/lib/game/types'
import { getWordRegion, type WordRegion } from '#/lib/game/word-regions'

type SnippetDisplayProps = {
  currentSnippet: NormalizedSnippet
  upcomingSnippet: NormalizedSnippet
  typedValue: string
}

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

export function SnippetDisplay({
  currentSnippet,
  upcomingSnippet,
  typedValue,
}: SnippetDisplayProps) {
  const activeIndex = typedValue.length
  const overflow =
    activeIndex > currentSnippet.normalized.length
      ? typedValue.slice(currentSnippet.normalized.length)
      : ''
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate — depend on stable .id, not full object/function refs, to avoid render loops
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
    const lookBehindPadding = 96
    const lookAheadPadding = 196
    const hysteresis = 48
    const visibleLeft = currentSnippetElement.scrollLeft
    const visibleRight = visibleLeft + currentSnippetElement.clientWidth
    const leftBoundary = visibleLeft + lookBehindPadding
    const rightBoundary = visibleRight - 96

    let nextScrollLeft = visibleLeft

    if (followAnchorRight > rightBoundary) {
      nextScrollLeft = Math.max(
        0,
        followAnchorRight - currentSnippetElement.clientWidth + lookAheadPadding - hysteresis,
      )
    } else if (caretLeftInSnippet < leftBoundary) {
      nextScrollLeft = Math.max(0, followAnchorLeft - lookBehindPadding + hysteresis)
    }

    if (nextScrollLeft !== visibleLeft) {
      currentSnippetElement.scrollLeft = nextScrollLeft
    }
  }, [activeIndex, currentSnippet.id, typedValue])

  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate — depend on stable .id, not full object refs
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
            className =
              wordRegion === 'past' ? 'snippet-word-past-typed' : 'text-[var(--color-text)]'
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
            className =
              typedChar === undefined
                ? 'snippet-char snippet-char-current snippet-space'
                : className
          }

          return (
            <span key={`${currentSnippet.id}-${index}`} className={className}>
              <span
                ref={(element) => {
                  characterRefs.current[scoringIndex] = element
                }}
              >
                {isSpace ? '·' : token.value}
              </span>
            </span>
          )
        })}

        {overflow.length > 0 ? (
          <span className="snippet-char snippet-char-error">{overflow.replaceAll(' ', '·')}</span>
        ) : null}
      </pre>

      <div className="h-px w-full bg-white/8" />

      {upcomingSnippet.id === SKELETON_SNIPPET_ID ? (
        <div className="snippet-upcoming-skeleton" aria-hidden="true">
          <span className="snippet-skeleton-bar snippet-skeleton-bar-a" />
          <span className="snippet-skeleton-bar snippet-skeleton-bar-b" />
          <span className="snippet-skeleton-bar snippet-skeleton-bar-c" />
        </div>
      ) : (
        <pre className="snippet-upcoming overflow-x-auto whitespace-pre">
          {upcomingSnippet.displayTokens.map((token, index) => {
            if (token.scoringIndex === null) {
              return renderIgnoredToken(token.value, `${upcomingSnippet.id}-${index}`)
            }

            return (
              <span key={`${upcomingSnippet.id}-${index}`}>
                {token.value === ' ' ? '·' : token.value}
              </span>
            )
          })}
        </pre>
      )}

      <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]/75">
        current snippet above, next snippet queued below
      </p>
    </div>
  )
}
