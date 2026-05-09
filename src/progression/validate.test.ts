import { describe, it, expect } from 'vitest'
import { validateProgression } from './validate'

describe('validateProgression', () => {
  const valid = {
    name: 'Test',
    chords: [
      { symbol: 'Cmaj7', pitchClasses: [0, 4, 7, 11], bass: 0 },
    ],
  }

  it('accepts a minimal valid progression', () => {
    const result = validateProgression(valid)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.progression.chords).toHaveLength(1)
  })

  it('accepts a progression without a name', () => {
    const { name, ...withoutName } = valid
    const result = validateProgression(withoutName)
    expect(result.ok).toBe(true)
  })

  it('rejects non-object input', () => {
    expect(validateProgression(null).ok).toBe(false)
    expect(validateProgression('hi').ok).toBe(false)
    expect(validateProgression(42).ok).toBe(false)
  })

  it('rejects an empty chords array', () => {
    const result = validateProgression({ chords: [] })
    expect(result.ok).toBe(false)
  })

  it('rejects a missing chords field', () => {
    const result = validateProgression({})
    expect(result.ok).toBe(false)
  })

  it('rejects a chord with an empty symbol', () => {
    const result = validateProgression({
      chords: [{ symbol: '', pitchClasses: [0, 4, 7], bass: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a chord with a pitch class out of range', () => {
    const result = validateProgression({
      chords: [{ symbol: 'X', pitchClasses: [0, 12], bass: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a chord with duplicate pitch classes', () => {
    const result = validateProgression({
      chords: [{ symbol: 'X', pitchClasses: [0, 0, 7], bass: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a chord whose bass is not in pitchClasses', () => {
    const result = validateProgression({
      chords: [{ symbol: 'Cmaj7', pitchClasses: [0, 4, 7, 11], bass: 5 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects pitchClasses with a non-integer value', () => {
    const result = validateProgression({
      chords: [{ symbol: 'X', pitchClasses: [0, 4.5, 7], bass: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('returns an error message describing the first problem', () => {
    const result = validateProgression({ chords: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(typeof result.error).toBe('string')
  })
})
