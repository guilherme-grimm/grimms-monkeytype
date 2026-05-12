import {
  type DifficultyFlags,
  type DifficultyPreset,
  type IndentMode,
  presetToFlags,
} from './difficulty'

// Custom-mode toggle bag. Each field is independently user-toggleable inside
// the Custom difficulty preset; weighted contributions sum into the final
// multiplier. The first three carry real gameplay behavior today; the trailing
// three are content-mod stubs for future char-tripping work.
export type ModSet = {
  autoSkipNewlines: boolean
  indentMode: IndentMode
  strict: boolean
  punctuation: boolean
  numbers: boolean
  caseSensitive: boolean
}

export const DEFAULT_MODS: ModSet = {
  ...presetToFlags('normal'),
  strict: false,
  punctuation: false,
  numbers: false,
  caseSensitive: false,
}

const MOD_WEIGHTS = {
  base: 1.0,
  noAutoSkipNewlines: 0.1,
  literalIndent: 0.15,
  strict: 1.0,
  caseSensitive: 0.1,
  punctuation: 0.05,
  numbers: 0.05,
} as const

export function modsMultiplier(mods: ModSet): number {
  let total = MOD_WEIGHTS.base

  if (!mods.autoSkipNewlines) total += MOD_WEIGHTS.noAutoSkipNewlines
  if (mods.indentMode === 'literal') total += MOD_WEIGHTS.literalIndent
  if (mods.strict) total += MOD_WEIGHTS.strict
  if (mods.caseSensitive) total += MOD_WEIGHTS.caseSensitive
  if (mods.punctuation) total += MOD_WEIGHTS.punctuation
  if (mods.numbers) total += MOD_WEIGHTS.numbers

  return Math.round(total * 100) / 100
}

export function presetToMods(preset: DifficultyPreset): ModSet {
  // 'custom' falls back to defaults — custom multiplier comes from the user's
  // ModSet, not the preset itself.
  if (preset === 'custom') return DEFAULT_MODS
  return {
    ...presetToFlags(preset),
    strict: false,
    punctuation: false,
    numbers: false,
    caseSensitive: false,
  }
}

// Project a ModSet onto the existing DifficultyFlags shape so normalization /
// indentation / sanitization keep their current API.
export function derivedFlags(mods: ModSet): DifficultyFlags {
  return {
    autoSkipNewlines: mods.autoSkipNewlines,
    indentMode: mods.indentMode,
  }
}

// Human-readable labels for the boolean toggles in ModSet. Sourced here so the
// drawer (settings UI) and the home-page summary line can't drift apart.
export const MOD_TOGGLE_LABELS: Record<Exclude<keyof ModSet, 'indentMode'>, string> = {
  autoSkipNewlines: 'auto-skip newlines',
  strict: 'strict (death)',
  caseSensitive: 'case sensitive',
  punctuation: 'punctuation',
  numbers: 'numbers',
}

export function normalizeMods(value: unknown): ModSet {
  if (typeof value !== 'object' || value === null) return DEFAULT_MODS
  const v = value as Record<string, unknown>
  const indentRaw = v.indentMode
  const indentMode: IndentMode =
    indentRaw === 'auto' || indentRaw === 'tab-helper' || indentRaw === 'literal'
      ? indentRaw
      : DEFAULT_MODS.indentMode
  return {
    autoSkipNewlines:
      typeof v.autoSkipNewlines === 'boolean' ? v.autoSkipNewlines : DEFAULT_MODS.autoSkipNewlines,
    indentMode,
    strict: typeof v.strict === 'boolean' ? v.strict : DEFAULT_MODS.strict,
    punctuation: typeof v.punctuation === 'boolean' ? v.punctuation : DEFAULT_MODS.punctuation,
    numbers: typeof v.numbers === 'boolean' ? v.numbers : DEFAULT_MODS.numbers,
    caseSensitive:
      typeof v.caseSensitive === 'boolean' ? v.caseSensitive : DEFAULT_MODS.caseSensitive,
  }
}
