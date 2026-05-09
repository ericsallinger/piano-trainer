export type ChordState = 'upcoming' | 'current' | 'completed'
export type FlashColor = 'green' | 'red' | null

export interface ChordSymbolProps {
  symbol: string
  state: ChordState
  flash?: FlashColor
}

export function ChordSymbol({ symbol, state, flash = null }: ChordSymbolProps) {
  const classes = ['chord', `chord--${state}`]
  if (flash === 'green') classes.push('chord--flash-green')
  if (flash === 'red') classes.push('chord--flash-red')

  return <span className={classes.join(' ')}>{symbol}</span>
}
