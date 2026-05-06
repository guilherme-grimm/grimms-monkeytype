import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DIFFICULTY,
  DEFAULT_FLAGS,
  difficultyPresets,
  isDifficultyPreset,
  presetMultiplier,
  presetToFlags,
} from './difficulty'

describe('difficulty', () => {
  it('exposes the three presets in canonical order', () => {
    expect(difficultyPresets).toEqual(['easy', 'normal', 'hard'])
  })

  it('defaults to normal', () => {
    expect(DEFAULT_DIFFICULTY).toBe('normal')
    expect(DEFAULT_FLAGS).toEqual({ autoSkipNewlines: true, indentMode: 'tab-helper' })
  })

  it('maps presets to flags', () => {
    expect(presetToFlags('easy')).toEqual({ autoSkipNewlines: true, indentMode: 'auto' })
    expect(presetToFlags('normal')).toEqual({ autoSkipNewlines: true, indentMode: 'tab-helper' })
    expect(presetToFlags('hard')).toEqual({ autoSkipNewlines: false, indentMode: 'tab-helper' })
  })

  it('maps presets to gentle multipliers', () => {
    expect(presetMultiplier('easy')).toBeCloseTo(0.85)
    expect(presetMultiplier('normal')).toBeCloseTo(1.0)
    expect(presetMultiplier('hard')).toBeCloseTo(1.25)
  })

  it('validates preset values via type guard', () => {
    expect(isDifficultyPreset('easy')).toBe(true)
    expect(isDifficultyPreset('hard')).toBe(true)
    expect(isDifficultyPreset('insane')).toBe(false)
    expect(isDifficultyPreset(null)).toBe(false)
    expect(isDifficultyPreset(undefined)).toBe(false)
  })
})
