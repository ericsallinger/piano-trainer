import { describe, it, expect } from 'vitest'
import { formatDuration, formatDelta } from './format'

describe('formatDuration', () => {
  it('formats 0ms as "0:00"', () => {
    expect(formatDuration(0)).toBe('0:00')
  })
  it('formats 4000ms as "0:04"', () => {
    expect(formatDuration(4000)).toBe('0:04')
  })
  it('formats 42000ms as "0:42"', () => {
    expect(formatDuration(42000)).toBe('0:42')
  })
  it('formats 65000ms as "1:05"', () => {
    expect(formatDuration(65000)).toBe('1:05')
  })
  it('formats 599000ms as "9:59"', () => {
    expect(formatDuration(599000)).toBe('9:59')
  })
  it('rounds 3500ms to "0:04"', () => {
    expect(formatDuration(3500)).toBe('0:04')
  })
})

describe('formatDelta', () => {
  it('returns "(+3.0s, 9% slow)" when 3s over a 32s expected', () => {
    expect(formatDelta(35000, 32000)).toBe('(+3.0s, 9% slow)')
  })
  it('returns "(-1.5s, 5% fast)" when 1.5s under a 32s expected', () => {
    expect(formatDelta(30500, 32000)).toBe('(-1.5s, 5% fast)')
  })
  it('returns "(on time)" when actual equals expected', () => {
    expect(formatDelta(32000, 32000)).toBe('(on time)')
  })
  it('returns "(on time)" within 50ms threshold', () => {
    expect(formatDelta(32030, 32000)).toBe('(on time)')
  })
  it('returns "(on time)" for 0 vs 0', () => {
    expect(formatDelta(0, 0)).toBe('(on time)')
  })
  it('returns delta without percent when expectedMs is 0', () => {
    expect(formatDelta(1000, 0)).toBe('(+1.0s)')
  })
})
