import { describe, it, expect } from 'vitest'
import { matchesChord } from './match'
import type { ChordSpec } from '../progression/types'

const Cmaj7: ChordSpec  = { symbol: 'Cmaj7',  pitchClasses: [0, 4, 7, 11], bass: 0 }
const Cmaj7E: ChordSpec = { symbol: 'Cmaj7/E', pitchClasses: [0, 4, 7, 11], bass: 4 }
const G7: ChordSpec     = { symbol: 'G7',     pitchClasses: [7, 11, 2, 5], bass: 7 }
const C: ChordSpec      = { symbol: 'C',      pitchClasses: [0, 4, 7],     bass: 0 }
const single: ChordSpec = { symbol: 'C',      pitchClasses: [0],           bass: 0 }

describe('matchesChord', () => {
  it('returns false for an empty held set', () => {
    expect(matchesChord(new Set(), Cmaj7)).toBe(false)
  })

  it('matches an exact root-position voicing', () => {
    // C4=60, E4=64, G4=67, B4=71
    expect(matchesChord(new Set([60, 64, 67, 71]), Cmaj7)).toBe(true)
  })

  it('matches with octave doublings of any pitch class', () => {
    // C3=48, C4=60, E4=64, G4=67, B4=71
    expect(matchesChord(new Set([48, 60, 64, 67, 71]), Cmaj7)).toBe(true)
    // also: doubled E and G
    expect(matchesChord(new Set([48, 60, 64, 67, 71, 76, 79]), Cmaj7)).toBe(true)
  })

  it('rejects when a foreign pitch class is added', () => {
    // adding D (62) which is pitch class 2
    expect(matchesChord(new Set([60, 62, 64, 67, 71]), Cmaj7)).toBe(false)
  })

  it('rejects when a required pitch class is missing', () => {
    // missing B (11)
    expect(matchesChord(new Set([60, 64, 67]), Cmaj7)).toBe(false)
  })

  it('rejects when bass is wrong even with right pitch classes (root vs first inversion)', () => {
    // root position notes but target requires E in bass
    expect(matchesChord(new Set([60, 64, 67, 71]), Cmaj7E)).toBe(false)
  })

  it('matches first inversion when bass is correct', () => {
    // E3=52 (lowest), G3=55, B3=59, C4=60
    expect(matchesChord(new Set([52, 55, 59, 60]), Cmaj7E)).toBe(true)
  })

  it('matches a triad without 7th', () => {
    expect(matchesChord(new Set([60, 64, 67]), C)).toBe(true)
  })

  it('rejects a triad that has an extra 7th', () => {
    expect(matchesChord(new Set([60, 64, 67, 71]), C)).toBe(false)
  })

  it('matches a single-note "chord"', () => {
    expect(matchesChord(new Set([60]), single)).toBe(true)
    expect(matchesChord(new Set([72]), single)).toBe(true)
    expect(matchesChord(new Set([60, 64]), single)).toBe(false)
  })

  it('matches G7 with various voicings', () => {
    // G3=55, B3=59, D4=62, F4=65
    expect(matchesChord(new Set([55, 59, 62, 65]), G7)).toBe(true)
    // doubled root, F lower
    expect(matchesChord(new Set([55, 65, 67, 71, 74]), G7)).toBe(true)
  })
})
