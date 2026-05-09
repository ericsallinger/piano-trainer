import type { Progression } from '../progression/types'
import { ChordSymbol, type ChordState, type FlashColor } from './ChordSymbol'

export interface FlashEvent {
  color: 'green' | 'red'
  onIndex: number
}

export interface ProgressionDisplayProps {
  progression: Progression
  cursor: number
  flash: FlashEvent | null
  onChordClick?: (index: number) => void
}

export function ProgressionDisplay({ progression, cursor, flash, onChordClick }: ProgressionDisplayProps) {
  return (
    <div className="progression">
      {progression.chords.map((chord, i) => {
        let state: ChordState = 'upcoming'
        if (i < cursor) state = 'completed'
        else if (i === cursor) state = 'current'

        const flashColor: FlashColor = flash && flash.onIndex === i ? flash.color : null

        return (
          <ChordSymbol
            key={i}
            symbol={chord.symbol}
            state={state}
            flash={flashColor}
            onClick={onChordClick ? () => onChordClick(i) : undefined}
          />
        )
      })}
    </div>
  )
}
