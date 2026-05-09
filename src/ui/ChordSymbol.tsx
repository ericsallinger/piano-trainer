export type ChordState = 'upcoming' | 'current' | 'completed'
export type FlashColor = 'green' | 'red' | null

export interface ChordSymbolProps {
  symbol: string
  state: ChordState
  flash?: FlashColor
  onClick?: () => void
}

export function ChordSymbol({ symbol, state, flash = null, onClick }: ChordSymbolProps) {
  const classes = ['chord', `chord--${state}`]
  if (flash === 'green') classes.push('chord--flash-green')
  if (flash === 'red') classes.push('chord--flash-red')
  if (onClick) classes.push('chord--clickable')

  return <span className={classes.join(' ')} onClick={onClick}>{symbol}</span>
}
