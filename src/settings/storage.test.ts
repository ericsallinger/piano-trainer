import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadSettings, saveSettings } from './storage'

describe('loadSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when localStorage is empty', () => {
    expect(loadSettings()).toEqual({ tempoEnabled: true, bpm: 40 })
  })

  it('round-trips via saveSettings', () => {
    saveSettings({ tempoEnabled: false, bpm: 80 })
    expect(loadSettings()).toEqual({ tempoEnabled: false, bpm: 80 })
  })

  it('returns defaults on malformed JSON', () => {
    localStorage.setItem('piano-trainer:settings', 'not-json')
    expect(loadSettings()).toEqual({ tempoEnabled: true, bpm: 40 })
  })

  it('clamps bpm below minimum to 20', () => {
    localStorage.setItem('piano-trainer:settings', JSON.stringify({ tempoEnabled: true, bpm: 5 }))
    expect(loadSettings().bpm).toBe(20)
  })

  it('clamps bpm above maximum to 300', () => {
    localStorage.setItem('piano-trainer:settings', JSON.stringify({ tempoEnabled: true, bpm: 9999 }))
    expect(loadSettings().bpm).toBe(300)
  })

  it('returns default bpm for non-numeric bpm', () => {
    localStorage.setItem('piano-trainer:settings', JSON.stringify({ tempoEnabled: true, bpm: 'abc' }))
    expect(loadSettings().bpm).toBe(40)
  })

  it('fills missing tempoEnabled with default when only bpm present', () => {
    localStorage.setItem('piano-trainer:settings', JSON.stringify({ bpm: 60 }))
    const settings = loadSettings()
    expect(settings.tempoEnabled).toBe(true)
    expect(settings.bpm).toBe(60)
  })

  it('fills missing bpm with default when only tempoEnabled present', () => {
    localStorage.setItem('piano-trainer:settings', JSON.stringify({ tempoEnabled: false }))
    const settings = loadSettings()
    expect(settings.tempoEnabled).toBe(false)
    expect(settings.bpm).toBe(40)
  })
})

describe('saveSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('writes exactly once to localStorage per call', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    saveSettings({ tempoEnabled: false, bpm: 60 })
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})
