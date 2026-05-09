import { useState } from 'react'

export interface ControlsStripProps {
  onRestart: () => void
  onReset: () => void
  canRestart: boolean
  canReset: boolean
  tempoEnabled: boolean
  bpm: number
  onTempoEnabledChange: (v: boolean) => void
  onBpmChange: (v: number) => void
}

export function ControlsStrip({
  onRestart,
  onReset,
  canRestart,
  canReset,
  tempoEnabled,
  bpm,
  onTempoEnabledChange,
  onBpmChange,
}: ControlsStripProps) {
  const [inputValue, setInputValue] = useState(String(bpm))

  function handleBpmChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setInputValue(raw)
    const v = parseInt(raw, 10)
    if (Number.isNaN(v)) return
    onBpmChange(Math.min(300, Math.max(20, v)))
  }

  function handleBpmBlur() {
    setInputValue(String(bpm))
  }

  return (
    <div className="controls-strip">
      <button onClick={onRestart} disabled={!canRestart}>Restart</button>
      <button onClick={onReset} disabled={!canReset}>Reset</button>
      <div className="tempo-controls">
        <button
          className={`toggle-btn${tempoEnabled ? ' toggle-btn--active' : ''}`}
          onClick={() => onTempoEnabledChange(!tempoEnabled)}
        >
          {tempoEnabled ? 'Tempo: ON' : 'Tempo: OFF'}
        </button>
        {tempoEnabled && (
          <>
            <label htmlFor="bpm-input">BPM</label>
            <input
              id="bpm-input"
              type="number"
              className="bpm-input"
              min={20}
              max={300}
              step={1}
              value={inputValue}
              onChange={handleBpmChange}
              onBlur={handleBpmBlur}
            />
          </>
        )}
      </div>
    </div>
  )
}
