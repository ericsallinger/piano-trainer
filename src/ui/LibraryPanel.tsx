import { useState, useEffect, useCallback } from 'react'
import type { Progression } from '../progression/types'
import {
  saveProgression,
  loadProgression,
  listProgressions,
  deleteProgression,
  reorderProgressions,
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
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

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

  function handleDragStart(e: React.DragEvent<HTMLLIElement>, index: number) {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // Firefox requires setData to initiate the drag.
    e.dataTransfer.setData('text/plain', String(index))
  }

  function handleDragOver(e: React.DragEvent<HTMLLIElement>, index: number) {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropIndex !== index) setDropIndex(index)
  }

  function handleDrop(e: React.DragEvent<HTMLLIElement>, targetIndex: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      setDropIndex(null)
      return
    }
    const reordered = [...entries]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setEntries(reordered)
    reorderProgressions(reordered.map((entry) => entry.name))
    setDragIndex(null)
    setDropIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDropIndex(null)
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
          {entries.map(({ name, stats }, index) => {
            const classes = ['library-item']
            if (dragIndex === index) classes.push('library-item--dragging')
            if (dropIndex === index && dragIndex !== null && dragIndex !== index) {
              classes.push('library-item--drop-target')
            }
            return (
              <li
                key={name}
                className={classes.join(' ')}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <span className="library-handle" aria-hidden>⋮⋮</span>
                <span className="library-name">{name}</span>
                <span className="library-stats">{formatStats(stats)}</span>
                <button aria-label={`Load ${name}`} onClick={() => handleLoad(name)}>
                  Load
                </button>
                <button aria-label={`Delete ${name}`} onClick={() => handleDelete(name)}>
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {error && <div role="alert" className="error">{error}</div>}
    </section>
  )
}
