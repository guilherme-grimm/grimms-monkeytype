import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MODS,
  derivedFlags,
  type ModSet,
  modsMultiplier,
  normalizeMods,
  presetToMods,
} from './mods'

const baseline: ModSet = { ...DEFAULT_MODS }

describe('mods', () => {
  it('default mods land at ×1.0 (matches normal preset)', () => {
    expect(modsMultiplier(baseline)).toBeCloseTo(1.0)
  })

  it('strict adds the heavy weight (~+1.0)', () => {
    expect(modsMultiplier({ ...baseline, strict: true })).toBeCloseTo(2.0)
  })

  it('literal indent + no auto-skip stack (~+0.25)', () => {
    expect(
      modsMultiplier({ ...baseline, autoSkipNewlines: false, indentMode: 'literal' }),
    ).toBeCloseTo(1.25)
  })

  it('content-mod stubs each contribute non-zero weight', () => {
    expect(modsMultiplier({ ...baseline, caseSensitive: true })).toBeCloseTo(1.1)
    expect(modsMultiplier({ ...baseline, punctuation: true })).toBeCloseTo(1.05)
    expect(modsMultiplier({ ...baseline, numbers: true })).toBeCloseTo(1.05)
  })

  it('presetToMods bridges existing presets without leaking strict', () => {
    expect(presetToMods('easy').strict).toBe(false)
    expect(presetToMods('hard').autoSkipNewlines).toBe(false)
    expect(presetToMods('custom')).toEqual(DEFAULT_MODS)
  })

  it('derivedFlags projects onto DifficultyFlags', () => {
    const flags = derivedFlags({ ...baseline, indentMode: 'literal', autoSkipNewlines: false })
    expect(flags).toEqual({ autoSkipNewlines: false, indentMode: 'literal' })
  })

  it('normalizeMods recovers from junk and missing fields', () => {
    expect(normalizeMods(null)).toEqual(DEFAULT_MODS)
    expect(normalizeMods({})).toEqual(DEFAULT_MODS)
    expect(normalizeMods({ indentMode: 'bogus' })).toEqual(DEFAULT_MODS)
    expect(normalizeMods({ strict: true, indentMode: 'literal' })).toEqual({
      ...DEFAULT_MODS,
      strict: true,
      indentMode: 'literal',
    })
  })
})
