import { useEffect } from 'react'

import { type ButtonVariant, getSharedButtonSoundPlayer } from '#/lib/game/button-sound'
import { loadStoredPreferences } from '#/lib/game/storage'

const VARIANT_CLASSES: Array<{ cls: string; variant: ButtonVariant }> = [
  { cls: 'button-primary', variant: 'primary' },
  { cls: 'button-accent', variant: 'accent' },
  { cls: 'button-secondary', variant: 'secondary' },
]

function variantFor(el: Element): ButtonVariant {
  for (const { cls, variant } of VARIANT_CLASSES) {
    if (el.classList.contains(cls)) return variant
  }
  return 'secondary'
}

// Selector covers <button> tags and link-styled buttons (e.g.
// <Link className="button-primary">) so the not-found page and home CTAs blip
// too. Listener is installed once at the root.
const SELECTOR = 'button, a.button-primary, a.button-secondary, a.button-accent'

export function useGlobalButtonSound() {
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      const match = target.closest(SELECTOR)
      if (!match) return
      if (match instanceof HTMLButtonElement && match.disabled) return
      // Opt-out for buttons that play their own audio (e.g. the audio
      // preview button) so the global blip doesn't pollute the preview.
      if (match.hasAttribute('data-no-button-sound')) return

      // Read storage sync on each event — O(1) localStorage hit, simpler than
      // mirroring the drawer's toggle into React state at the root. Default ON
      // when unset.
      const prefs = loadStoredPreferences()
      if (prefs?.buttonSoundEnabled === false) return

      void getSharedButtonSoundPlayer().playButtonClick(variantFor(match))
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])
}
