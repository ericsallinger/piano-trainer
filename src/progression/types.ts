export interface ChordSpec {
  symbol: string
  pitchClasses: number[]
  bass: number
}

export interface Progression {
  name?: string
  chords: ChordSpec[]
}
