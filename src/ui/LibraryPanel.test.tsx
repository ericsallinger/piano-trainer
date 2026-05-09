import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LibraryPanel } from './LibraryPanel'
import { saveProgression } from '../library/storage'
import type { Progression } from '../progression/types'

const example: Progression = {
  name: 'X',
  chords: [{ symbol: 'C', pitchClasses: [0, 4, 7], bass: 0 }],
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('<LibraryPanel>', () => {
  it('renders saved progression names', () => {
    saveProgression('Alpha', example)
    saveProgression('Beta', example)
    render(<LibraryPanel current={null} onLoad={() => {}} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('calls onLoad with the saved progression when Load is clicked', async () => {
    const user = userEvent.setup()
    saveProgression('Alpha', example)
    const onLoad = vi.fn()
    render(<LibraryPanel current={null} onLoad={onLoad} />)
    await user.click(screen.getByRole('button', { name: /load alpha/i }))
    expect(onLoad).toHaveBeenCalledWith(example)
  })

  it('removes a progression when Delete is clicked', async () => {
    const user = userEvent.setup()
    saveProgression('Alpha', example)
    render(<LibraryPanel current={null} onLoad={() => {}} />)
    await user.click(screen.getByRole('button', { name: /delete alpha/i }))
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('saves the current progression with the entered name', async () => {
    const user = userEvent.setup()
    render(<LibraryPanel current={example} onLoad={() => {}} />)
    await user.type(screen.getByPlaceholderText(/save as/i), 'Newname')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText('Newname')).toBeInTheDocument()
  })

  it('does not show the save row when no progression is loaded', () => {
    render(<LibraryPanel current={null} onLoad={() => {}} />)
    expect(screen.queryByPlaceholderText(/save as/i)).not.toBeInTheDocument()
  })
})
