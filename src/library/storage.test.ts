import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveProgression,
  loadProgression,
  listProgressions,
  deleteProgression,
} from './storage'
import type { Progression } from '../progression/types'

const example: Progression = {
  name: 'Example',
  chords: [{ symbol: 'C', pitchClasses: [0, 4, 7], bass: 0 }],
}

beforeEach(() => {
  localStorage.clear()
})

describe('library storage', () => {
  it('saves and loads a progression by name', () => {
    const r = saveProgression('Test1', example)
    expect(r.ok).toBe(true)
    expect(loadProgression('Test1')).toEqual(example)
  })

  it('returns null for an unknown name', () => {
    expect(loadProgression('Nope')).toBeNull()
  })

  it('lists saved names sorted alphabetically', () => {
    saveProgression('Charlie', example)
    saveProgression('Alpha', example)
    saveProgression('Bravo', example)
    expect(listProgressions()).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('deletes a progression', () => {
    saveProgression('ToDelete', example)
    deleteProgression('ToDelete')
    expect(loadProgression('ToDelete')).toBeNull()
    expect(listProgressions()).not.toContain('ToDelete')
  })

  it('overwrites an existing entry on save with the same name', () => {
    saveProgression('Same', example)
    const updated: Progression = {
      name: 'Same',
      chords: [{ symbol: 'F', pitchClasses: [5, 9, 0], bass: 5 }],
    }
    saveProgression('Same', updated)
    expect(loadProgression('Same')).toEqual(updated)
    expect(listProgressions()).toEqual(['Same'])
  })

  it('rejects an empty name', () => {
    const r = saveProgression('', example)
    expect(r.ok).toBe(false)
  })

  it('returns an error result if localStorage throws (quota exceeded)', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      const err = new Error('quota')
      ;(err as Error & { name: string }).name = 'QuotaExceededError'
      throw err
    }
    try {
      const r = saveProgression('Big', example)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/quota|storage/i)
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
