import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProgressionTimer } from './useProgressionTimer'

describe('useProgressionTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with both timestamps null', () => {
    const { result } = renderHook(() =>
      useProgressionTimer({ cursor: 0, totalChords: 3, enabled: true })
    )
    expect(result.current.startMs).toBeNull()
    expect(result.current.endMs).toBeNull()
  })

  it('sets startMs when cursor moves to 1 with enabled=true', () => {
    const { result, rerender } = renderHook(
      (props) => useProgressionTimer(props),
      { initialProps: { cursor: 0, totalChords: 3, enabled: true } }
    )
    vi.setSystemTime(1000)
    rerender({ cursor: 1, totalChords: 3, enabled: true })
    expect(result.current.startMs).toBe(1000)
    expect(result.current.endMs).toBeNull()
  })

  it('does not set startMs when enabled=false', () => {
    const { result, rerender } = renderHook(
      (props) => useProgressionTimer(props),
      { initialProps: { cursor: 0, totalChords: 3, enabled: false } }
    )
    vi.setSystemTime(1000)
    rerender({ cursor: 1, totalChords: 3, enabled: false })
    expect(result.current.startMs).toBeNull()
  })

  it('does not overwrite startMs on subsequent cursor advances', () => {
    const { result, rerender } = renderHook(
      (props) => useProgressionTimer(props),
      { initialProps: { cursor: 0, totalChords: 3, enabled: true } }
    )
    vi.setSystemTime(1000)
    rerender({ cursor: 1, totalChords: 3, enabled: true })
    vi.setSystemTime(2000)
    rerender({ cursor: 2, totalChords: 3, enabled: true })
    expect(result.current.startMs).toBe(1000)
  })

  it('sets endMs when cursor reaches totalChords', () => {
    const { result, rerender } = renderHook(
      (props) => useProgressionTimer(props),
      { initialProps: { cursor: 0, totalChords: 3, enabled: true } }
    )
    vi.setSystemTime(1000)
    rerender({ cursor: 1, totalChords: 3, enabled: true })
    vi.setSystemTime(5000)
    rerender({ cursor: 3, totalChords: 3, enabled: true })
    expect(result.current.startMs).toBe(1000)
    expect(result.current.endMs).toBe(5000)
  })

  it('does not set endMs if enabled is toggled off after timer started', () => {
    const { result, rerender } = renderHook(
      (props) => useProgressionTimer(props),
      { initialProps: { cursor: 0, totalChords: 3, enabled: true } }
    )
    rerender({ cursor: 1, totalChords: 3, enabled: true })
    rerender({ cursor: 3, totalChords: 3, enabled: false })
    expect(result.current.endMs).toBeNull()
  })

  it('reset clears both timestamps and allows fresh measurement', () => {
    const { result, rerender } = renderHook(
      (props) => useProgressionTimer(props),
      { initialProps: { cursor: 0, totalChords: 3, enabled: true } }
    )
    vi.setSystemTime(1000)
    rerender({ cursor: 1, totalChords: 3, enabled: true })
    expect(result.current.startMs).toBe(1000)
    act(() => result.current.reset())
    expect(result.current.startMs).toBeNull()
    expect(result.current.endMs).toBeNull()
    vi.setSystemTime(2000)
    rerender({ cursor: 1, totalChords: 3, enabled: true })
    // After reset, cursor=1 with startMs=null triggers fresh start
    // Need one more rerender to trigger the effect after reset cleared the ref
    rerender({ cursor: 0, totalChords: 3, enabled: true })
    vi.setSystemTime(3000)
    rerender({ cursor: 1, totalChords: 3, enabled: true })
    expect(result.current.startMs).toBe(3000)
  })

  it('handles single-chord progression: sets both on cursor 0->1', () => {
    const { result, rerender } = renderHook(
      (props) => useProgressionTimer(props),
      { initialProps: { cursor: 0, totalChords: 1, enabled: true } }
    )
    vi.setSystemTime(1000)
    rerender({ cursor: 1, totalChords: 1, enabled: true })
    expect(result.current.startMs).not.toBeNull()
    expect(result.current.endMs).not.toBeNull()
    expect(result.current.endMs!).toBeGreaterThanOrEqual(result.current.startMs!)
  })

  it('does not restart timer on backward cursor jump', () => {
    const { result, rerender } = renderHook(
      (props) => useProgressionTimer(props),
      { initialProps: { cursor: 0, totalChords: 3, enabled: true } }
    )
    vi.setSystemTime(1000)
    rerender({ cursor: 1, totalChords: 3, enabled: true })
    const originalStart = result.current.startMs
    rerender({ cursor: 0, totalChords: 3, enabled: true })
    vi.setSystemTime(2000)
    rerender({ cursor: 1, totalChords: 3, enabled: true })
    expect(result.current.startMs).toBe(originalStart)
  })
})
