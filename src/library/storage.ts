import type { Progression } from '../progression/types'

const PREFIX = 'pianoTrainer:progression:'
const STATS_PREFIX = 'pianoTrainer:stats:'

export interface ProgressionStats {
  completions: number
  bestBpm: number | null
}

const EMPTY_STATS: ProgressionStats = { completions: 0, bestBpm: null }

export type SaveResult = { ok: true } | { ok: false; error: string }

export function saveProgression(name: string, progression: Progression): SaveResult {
  if (name.length === 0) return { ok: false, error: 'Name cannot be empty' }
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(progression))
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return { ok: false, error: `Storage error: ${msg}` }
  }
}

export function loadProgression(name: string): Progression | null {
  const raw = localStorage.getItem(PREFIX + name)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as Progression
  } catch {
    return null
  }
}

export function listProgressions(): string[] {
  const names: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX)) {
      names.push(key.slice(PREFIX.length))
    }
  }
  return names.sort((a, b) => a.localeCompare(b))
}

export function deleteProgression(name: string): void {
  localStorage.removeItem(PREFIX + name)
  localStorage.removeItem(STATS_PREFIX + name)
}

export function loadStats(name: string): ProgressionStats {
  const raw = localStorage.getItem(STATS_PREFIX + name)
  if (raw === null) return { ...EMPTY_STATS }
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressionStats>
    const completions = typeof parsed.completions === 'number' && parsed.completions >= 0
      ? Math.floor(parsed.completions)
      : 0
    const bestBpm = typeof parsed.bestBpm === 'number' && parsed.bestBpm > 0
      ? parsed.bestBpm
      : null
    return { completions, bestBpm }
  } catch {
    return { ...EMPTY_STATS }
  }
}

export function recordCompletion(name: string, bpm: number | null): void {
  const current = loadStats(name)
  const next: ProgressionStats = {
    completions: current.completions + 1,
    bestBpm: bpm !== null && (current.bestBpm === null || bpm > current.bestBpm)
      ? bpm
      : current.bestBpm,
  }
  try {
    localStorage.setItem(STATS_PREFIX + name, JSON.stringify(next))
  } catch {
    // best-effort; failure to persist a completion is non-fatal
  }
}
