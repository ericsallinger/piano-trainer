import { useState } from 'react'
import type { Progression } from '../progression/types'
import { validateProgression } from '../progression/validate'

export interface LoadPanelProps {
  onLoad: (progression: Progression) => void
}

export function LoadPanel({ onLoad }: LoadPanelProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleLoad() {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      setError(`Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`)
      return
    }
    const result = validateProgression(parsed)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    onLoad(result.progression)
  }

  return (
    <section className="panel load-panel">
      <h2>Add progression</h2>
      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{"name":"...","chords":[{"symbol":"C","pitchClasses":[0,4,7],"bass":0}]}'
      />
      <div className="panel-controls">
        <button onClick={handleLoad}>Add</button>
      </div>
      {error && <div role="alert" className="error">{error}</div>}
    </section>
  )
}
