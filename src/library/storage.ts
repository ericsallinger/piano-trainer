import type { Progression } from '../progression/types'

const PREFIX = 'pianoTrainer:progression:'

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
}
