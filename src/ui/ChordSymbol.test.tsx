import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ChordSymbol } from './ChordSymbol'

describe('<ChordSymbol>', () => {
  it('renders the symbol text', () => {
    const { getByText } = render(<ChordSymbol symbol="Cmaj7" state="upcoming" />)
    expect(getByText('Cmaj7')).toBeInTheDocument()
  })

  it('applies the current class when state=current', () => {
    const { getByText } = render(<ChordSymbol symbol="G7" state="current" />)
    expect(getByText('G7')).toHaveClass('chord--current')
  })

  it('applies the completed class when state=completed', () => {
    const { getByText } = render(<ChordSymbol symbol="F" state="completed" />)
    expect(getByText('F')).toHaveClass('chord--completed')
  })

  it('applies the flash-green class when flash=green', () => {
    const { getByText } = render(<ChordSymbol symbol="C" state="current" flash="green" />)
    expect(getByText('C')).toHaveClass('chord--flash-green')
  })

  it('applies the flash-red class when flash=red', () => {
    const { getByText } = render(<ChordSymbol symbol="C" state="current" flash="red" />)
    expect(getByText('C')).toHaveClass('chord--flash-red')
  })
})
