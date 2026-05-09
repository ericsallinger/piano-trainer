import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressionDisplay } from './ProgressionDisplay'
import type { Progression } from '../progression/types'

const prog: Progression = {
  name: 'Test',
  chords: [
    { symbol: 'Dm7',  pitchClasses: [2, 5, 9, 0],  bass: 2 },
    { symbol: 'G7',   pitchClasses: [7, 11, 2, 5], bass: 7 },
    { symbol: 'Cmaj7', pitchClasses: [0, 4, 7, 11], bass: 0 },
  ],
}

describe('<ProgressionDisplay>', () => {
  it('renders all chord symbols in order', () => {
    const { getAllByText } = render(
      <ProgressionDisplay progression={prog} cursor={0} flash={null} />,
    )
    expect(getAllByText(/Dm7|G7|Cmaj7/)).toHaveLength(3)
  })

  it('marks chords before cursor as completed and current/upcoming correctly', () => {
    const { getByText } = render(
      <ProgressionDisplay progression={prog} cursor={1} flash={null} />,
    )
    expect(getByText('Dm7')).toHaveClass('chord--completed')
    expect(getByText('G7')).toHaveClass('chord--current')
    expect(getByText('Cmaj7')).toHaveClass('chord--upcoming')
  })

  it('flashes green on the just-completed chord (cursor-1)', () => {
    // After advancing from chord 0 to chord 1, the green flash applies to chord 0
    const { getByText } = render(
      <ProgressionDisplay progression={prog} cursor={1} flash={{ color: 'green', onIndex: 0 }} />,
    )
    expect(getByText('Dm7')).toHaveClass('chord--flash-green')
  })

  it('flashes red on the current chord', () => {
    const { getByText } = render(
      <ProgressionDisplay progression={prog} cursor={1} flash={{ color: 'red', onIndex: 1 }} />,
    )
    expect(getByText('G7')).toHaveClass('chord--flash-red')
  })
})
