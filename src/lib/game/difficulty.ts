export const difficultyPresets = ['easy', 'normal', 'hard', 'custom'] as const

export type DifficultyPreset = (typeof difficultyPresets)[number]

export type IndentMode = 'auto' | 'tab-helper' | 'literal'

export type DifficultyFlags = {
  autoSkipNewlines: boolean
  indentMode: IndentMode
}

export const DEFAULT_DIFFICULTY: DifficultyPreset = 'normal'

export function isDifficultyPreset(value: unknown): value is DifficultyPreset {
  return typeof value === 'string' && (difficultyPresets as readonly string[]).includes(value)
}

export function presetToFlags(preset: DifficultyPreset): DifficultyFlags {
  switch (preset) {
    case 'easy':
      return { autoSkipNewlines: true, indentMode: 'auto' }
    case 'normal':
      return { autoSkipNewlines: true, indentMode: 'tab-helper' }
    case 'hard':
      // Tab as an indent shortcut stays available in Hard — the added
      // difficulty is typing newlines literally, not babysitting indent
      // (matches IDE muscle memory). 'literal' remains a flag value so
      // independent toggles can opt into it later.
      return { autoSkipNewlines: false, indentMode: 'tab-helper' }
    case 'custom':
      // Sentinel — real flags come from the user's ModSet via derivedFlags().
      // This branch is only reached by code paths not yet migrated to mods.
      return { autoSkipNewlines: true, indentMode: 'tab-helper' }
  }
}

export function presetMultiplier(preset: DifficultyPreset): number {
  switch (preset) {
    case 'easy':
      return 0.85
    case 'normal':
      return 1.0
    case 'hard':
      return 1.25
    case 'custom':
      // Sentinel — custom multiplier is derived from the user's ModSet by
      // modsMultiplier(). callers detect mode==='custom' and route there.
      return 1.0
  }
}

export const DEFAULT_FLAGS: DifficultyFlags = presetToFlags(DEFAULT_DIFFICULTY)

// Single-line, tooltip-shaped explainers — kept short so they fit a floating
// hint above a pill without wrapping awkwardly. Drawer has its own longer
// description block; this is for hover/focus on selectors.
export const PRESET_TOOLTIPS: Record<DifficultyPreset, string> = {
  easy: 'Newlines auto-skip. Tab fills indentation. Score ×0.85.',
  normal: 'Newlines auto-skip. Tab fills indentation. Score ×1.00.',
  hard: 'Type every newline. Tab still fills indentation. Score ×1.25.',
  custom: 'Pick your own mods. Multiplier scales with what you turn on.',
}
