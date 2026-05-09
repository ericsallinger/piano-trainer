import { useState, useEffect, useCallback } from 'react'
import type { Progression } from '../progression/types'
import {
  saveProgression,
  loadProgression,
  listProgressions,
  deleteProgression,
} from '../library/storage'

export interface LibraryPanelProps {
  current: Progression | null
  onLoad: (progression: Progression) => void
}

export function LibraryPanel({ current, onLoad }: LibraryPanelProps) {
  const [names, setNames] = useState<string[]>([])
  const [saveName, setSaveName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setNames(listProgressions())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function handleLoad(name: string) {
    const p = loadProgression(name)
    if (p) onLoad(p)
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
    if (names.includes(trimmed)) {
      if (!window.confirm(`Overwrite existing "${trimmed}"?`)) return
    }
    const result = saveProgression(trimmed, current)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    refresh()
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

      {names.length === 0 ? (
        <p className="library-empty">No saved progressions yet.</p>
      ) : (
        <ul className="library-list">
          {names.map((name) => (
            <li key={name}>
              <span className="library-name">{name}</span>
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
