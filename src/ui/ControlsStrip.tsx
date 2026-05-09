export interface ControlsStripProps {
  onRestart: () => void
  onReset: () => void
  canRestart: boolean
  canReset: boolean
}

export function ControlsStrip({ onRestart, onReset, canRestart, canReset }: ControlsStripProps) {
  return (
    <div className="controls-strip">
      <button onClick={onRestart} disabled={!canRestart}>
        Restart
      </button>
      <button onClick={onReset} disabled={!canReset}>
        Reset
      </button>
    </div>
  )
}
