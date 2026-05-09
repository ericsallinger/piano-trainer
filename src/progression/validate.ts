import type { Progression, ChordSpec } from './types'

export type ValidationResult =
  | { ok: true; progression: Progression }
  | { ok: false; error: string }

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n)
}

function isPitchClass(n: unknown): n is number {
  return isInt(n) && n >= 0 && n <= 11
}

function validateChord(input: unknown, index: number): ChordSpec | string {
  if (typeof input !== 'object' || input === null) {
    return `chords[${index}] is not an object`
  }
  const c = input as Record<string, unknown>

  if (typeof c.symbol !== 'string' || c.symbol.length === 0) {
    return `chords[${index}].symbol must be a non-empty string`
  }
  if (!Array.isArray(c.pitchClasses) || c.pitchClasses.length === 0 || c.pitchClasses.length > 12) {
    return `chords[${index}].pitchClasses must be an array of 1-12 items`
  }
  for (const pc of c.pitchClasses) {
    if (!isPitchClass(pc)) {
      return `chords[${index}].pitchClasses contains a non-integer or out-of-range value`
    }
  }
  const seen = new Set<number>()
  for (const pc of c.pitchClasses as number[]) {
    if (seen.has(pc)) return `chords[${index}].pitchClasses has a duplicate`
    seen.add(pc)
  }
  if (!isPitchClass(c.bass)) {
    return `chords[${index}].bass must be an integer 0-11`
  }
  if (!seen.has(c.bass as number)) {
    return `chords[${index}].bass must be one of pitchClasses`
  }

  return {
    symbol: c.symbol,
    pitchClasses: [...(c.pitchClasses as number[])],
    bass: c.bass as number,
  }
}

export function validateProgression(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'input must be a JSON object' }
  }
  const obj = input as Record<string, unknown>

  if (obj.name !== undefined && typeof obj.name !== 'string') {
    return { ok: false, error: 'name must be a string when present' }
  }

  if (!Array.isArray(obj.chords)) {
    return { ok: false, error: 'chords must be an array' }
  }
  if (obj.chords.length === 0) {
    return { ok: false, error: 'chords must be non-empty' }
  }

  const chords: ChordSpec[] = []
  for (let i = 0; i < obj.chords.length; i++) {
    const result = validateChord(obj.chords[i], i)
    if (typeof result === 'string') return { ok: false, error: result }
    chords.push(result)
  }

  return {
    ok: true,
    progression: {
      ...(typeof obj.name === 'string' ? { name: obj.name } : {}),
      chords,
    },
  }
}
