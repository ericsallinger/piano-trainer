import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSettings } from './useSettings'

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns defaults when localStorage is empty', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.tempoEnabled).toBe(true)
    expect(result.current.bpm).toBe(40)
  })

  it('reads persisted settings from localStorage on mount', () => {
    localStorage.setItem(
      'piano-trainer:settings',
      JSON.stringify({ tempoEnabled: false, bpm: 80 })
    )
    const { result } = renderHook(() => useSettings())
    expect(result.current.tempoEnabled).toBe(false)
    expect(result.current.bpm).toBe(80)
  })

  it('setBpm updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useSettings())
    act(() => result.current.setBpm(120))
    expect(result.current.bpm).toBe(120)
    const stored = JSON.parse(localStorage.getItem('piano-trainer:settings')!)
    expect(stored.bpm).toBe(120)
  })

  it('setTempoEnabled updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useSettings())
    act(() => result.current.setTempoEnabled(false))
    expect(result.current.tempoEnabled).toBe(false)
    const stored = JSON.parse(localStorage.getItem('piano-trainer:settings')!)
    expect(stored.tempoEnabled).toBe(false)
  })
})
