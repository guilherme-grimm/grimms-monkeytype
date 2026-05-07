import type { Rank } from '#/lib/game/scoring'

// Mirrors `.rank-badge-{s,a,b,c,d}` styling in src/styles.css. Satori cannot
// consume Tailwind/CSS classes, so the visual identity is duplicated here as
// raw values. If the on-screen badge is restyled, update this map alongside.
export const RANK_BORDER: Record<Rank, string> = {
  S: 'rgba(168, 255, 140, 0.95)',
  A: 'rgba(132, 226, 114, 0.85)',
  B: 'rgba(124, 171, 121, 0.7)',
  C: 'rgba(124, 171, 121, 0.5)',
  D: 'rgba(255, 168, 123, 0.5)',
}

export const RANK_GLOW: Record<Rank, string> = {
  S: 'rgba(168, 255, 140, 0.45)',
  A: 'rgba(132, 226, 114, 0.35)',
  B: 'rgba(124, 171, 121, 0.2)',
  C: 'rgba(124, 171, 121, 0.15)',
  D: 'rgba(255, 168, 123, 0.25)',
}

export const RANK_LETTER: Record<Rank, string> = {
  S: '#cbff9f',
  A: '#cbff9f',
  B: '#cbff9f',
  C: '#cbff9f',
  D: 'rgba(255, 207, 168, 0.95)',
}

// Site palette mirrored from src/styles.css:5-15
export const PALETTE = {
  bg: '#010201',
  bgRaised: '#060806',
  panel: 'rgba(8, 14, 8, 0.92)',
  text: '#9bdb9b',
  textStrong: '#cbff9f',
  primary: '#62ff62',
  primaryGlow: '#cbff9f',
  accent: '#ff5c5c',
  muted: 'rgba(155, 219, 155, 0.55)',
  border: 'rgba(132, 226, 114, 0.35)',
} as const
