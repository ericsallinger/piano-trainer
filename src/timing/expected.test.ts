import { describe, it, expect } from 'vitest'
import { computeExpectedMs } from './expected'

describe('computeExpectedMs', () => {
  it('returns 4000 for 2 chords at 60bpm', () => {
    expect(computeExpectedMs(2, 60)).toBe(4000)
  })
  it('returns 12000 for 4 chords at 60bpm', () => {
    expect(computeExpectedMs(4, 60)).toBe(12000)
  })
  it('returns 42000 for 8 chords at 40bpm', () => {
    expect(computeExpectedMs(8, 40)).toBe(42000)
  })
  it('returns 0 for single-chord progression', () => {
    expect(computeExpectedMs(1, 60)).toBe(0)
  })
  it('returns 2000 for 2 chords at 120bpm', () => {
    expect(computeExpectedMs(2, 120)).toBe(2000)
  })
})
