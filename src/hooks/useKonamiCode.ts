import { useEffect, useRef } from 'react'

const KONAMI_SEQUENCE = [
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

export function useKonamiCode(onUnlock: () => void) {
  const indexRef = useRef(0)
  const callbackRef = useRef(onUnlock)
  callbackRef.current = onUnlock

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }

      const expected = KONAMI_SEQUENCE[indexRef.current]
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key

      if (key === expected) {
        indexRef.current += 1
        if (indexRef.current === KONAMI_SEQUENCE.length) {
          indexRef.current = 0
          callbackRef.current()
        }
      } else {
        indexRef.current = key === KONAMI_SEQUENCE[0] ? 1 : 0
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])
}
