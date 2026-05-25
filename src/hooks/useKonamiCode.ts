import { useEffect, useRef } from 'react'

export const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const

export const REVERSE_KONAMI_SEQUENCE = [...KONAMI_SEQUENCE].reverse() as ReadonlyArray<string>

export function useKeySequence(sequence: ReadonlyArray<string>, onMatch: () => void) {
  const indexRef = useRef(0)
  const callbackRef = useRef(onMatch)
  callbackRef.current = onMatch

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }

      const expected = sequence[indexRef.current]
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key

      if (key === expected) {
        indexRef.current += 1
        if (indexRef.current === sequence.length) {
          indexRef.current = 0
          callbackRef.current()
        }
      } else {
        indexRef.current = key === sequence[0] ? 1 : 0
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [sequence])
}

export function useKonamiCode(onUnlock: () => void) {
  useKeySequence(KONAMI_SEQUENCE, onUnlock)
}

export function useReverseKonamiCode(onUnlock: () => void) {
  useKeySequence(REVERSE_KONAMI_SEQUENCE, onUnlock)
}
