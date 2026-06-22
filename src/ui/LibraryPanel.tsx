import { useState, useEffect, useCallback } from 'react'
import type { Progression } from '../progression/types'
import {
  saveProgression,
  loadProgression,
  listProgressions,
  deleteProgression,
  loadStats,
  type ProgressionStats,
} from '../library/storage'

export interface LibraryPanelProps {
  current: Progression | null
  onLoad: (progression: Progression, name: string) => void
  onSaved?: (name: string) => void
}

interface LibraryEntry {
  name: string
  stats: ProgressionStats
}

export function LibraryPanel({ current, onLoad, onSaved }: LibraryPanelProps) {
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [saveName, setSaveName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setEntries(listProgressions().map((name) => ({ name, stats: loadStats(name) })))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function handleLoad(name: string) {
    const p = loadProgression(name)
    if (p) onLoad(p, name)
  }

  function handleDelete(name: string) {
    if (!window.confirm(`Delete "${name}"?`)) return
    deleteProgression(name)
    refresh()
  }

  function handleSave() {
    if (!current) return
    const trimmed = saveName.trim()
    if (!trimmed) {
      setError('Name cannot be empty')
      return
    }
    if (entries.some((e) => e.name === trimmed)) {
      if (!window.confirm(`Overwrite existing "${trimmed}"?`)) return
    }
    const result = saveProgression(trimmed, current)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    refresh()
    onSaved?.(trimmed)
  }

  function formatStats(stats: ProgressionStats): string {
    const completions = `${stats.completions}×`
    const best = stats.bestBpm !== null ? ` · best ${stats.bestBpm} BPM` : ''
    return completions + best
  }

  return (
    <section className="panel library-panel">
      <h2>Library</h2>

      {current && (
        <div className="library-save-row">
          <input
            type="text"
            placeholder="Save as..."
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
          />
          <button onClick={handleSave}>Save</button>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="library-empty">No saved progressions yet.</p>
      ) : (
        <ul className="library-list">
          {entries.map(({ name, stats }) => (
            <li key={name}>
              <span className="library-name">{name}</span>
              <span className="library-stats">{formatStats(stats)}</span>
              <button aria-label={`Load ${name}`} onClick={() => handleLoad(name)}>
                Load
              </button>
              <button aria-label={`Delete ${name}`} onClick={() => handleDelete(name)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <div role="alert" className="error">{error}</div>}
    </section>
  )
}
