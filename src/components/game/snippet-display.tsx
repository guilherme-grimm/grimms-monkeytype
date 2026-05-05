import { useLayoutEffect, useRef, useState } from 'react'

import type { NormalizedSnippet } from '#/lib/game/types'

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
        {'    '}
      </span>
    )
  }

  return <span key={key}>{tokenValue}</span>
}

export function SnippetDisplay({ currentSnippet, upcomingSnippet, typedValue }: SnippetDisplayProps) {
  const activeIndex = typedValue.length
  const overflow = activeIndex > currentSnippet.normalized.length ? typedValue.slice(currentSnippet.normalized.length) : ''
  const containerRef = useRef<HTMLDivElement | null>(null)
  const characterRefs = useRef<Record<number, HTMLSpanElement | null>>({})
  const [caretStyle, setCaretStyle] = useState({
    x: 0,
    y: 0,
    height: 28,
    visible: false,
  })

  useLayoutEffect(() => {
    const container = containerRef.current

    if (!container) {
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

      <pre className="snippet-current whitespace-pre-wrap break-words">
        {currentSnippet.displayTokens.map((token, index) => {
          if (token.scoringIndex === null) {
            return renderIgnoredToken(token.value, `${currentSnippet.id}-${index}`)
          }

          const scoringIndex = token.scoringIndex
          const typedChar = typedValue[scoringIndex]
          const targetChar = currentSnippet.normalized[scoringIndex]
          const isCurrent = scoringIndex === activeIndex
          const isSpace = targetChar === ' '
          let className = 'text-[var(--color-muted)]'

          if (typedChar === undefined) {
            className = isCurrent
              ? 'snippet-char snippet-char-current'
              : 'text-[var(--color-muted)]'
          } else if (typedChar === targetChar) {
            className = 'text-[var(--color-text)]'
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
                {isSpace ? '·' : token.value}
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

      <pre className="snippet-upcoming whitespace-pre-wrap break-words">
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
