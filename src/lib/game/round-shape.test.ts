import { describe, expect, it } from 'vitest'

import {
  isRoundShape,
  SURVIVAL,
  survivalBonusFromGain,
  survivalThresholdsCrossed,
} from './round-shape'

describe('round-shape', () => {
  it('isRoundShape rejects non-shapes', () => {
    expect(isRoundShape('timed')).toBe(true)
    expect(isRoundShape('survival')).toBe(true)
    expect(isRoundShape('endless')).toBe(false)
    expect(isRoundShape(undefined)).toBe(false)
  })

  it('zero gain crosses zero thresholds and earns no bonus', () => {
    expect(survivalThresholdsCrossed(0)).toBe(0)
    expect(survivalBonusFromGain(0)).toBe(0)
  })

  it('crosses one threshold per multiplierStepThresholdMs of accumulated gain', () => {
    const step = SURVIVAL.multiplierStepThresholdMs
    expect(survivalThresholdsCrossed(step - 0.001)).toBe(0)
    expect(survivalThresholdsCrossed(step)).toBe(1)
    expect(survivalThresholdsCrossed(step * 3.5)).toBe(3)
  })

  it('bonus stacks linearly with crossed thresholds', () => {
    const step = SURVIVAL.multiplierStepThresholdMs
    expect(survivalBonusFromGain(step * 5)).toBeCloseTo(SURVIVAL.multiplierStep * 5)
  })
})
