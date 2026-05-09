import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoadPanel } from './LoadPanel'

const validJson = JSON.stringify({
  name: 'Test',
  chords: [{ symbol: 'C', pitchClasses: [0, 4, 7], bass: 0 }],
})

describe('<LoadPanel>', () => {
  it('calls onLoad with parsed Progression on valid JSON', async () => {
    const user = userEvent.setup()
    const onLoad = vi.fn()
    render(<LoadPanel onLoad={onLoad} />)

    await user.click(screen.getByRole('textbox'))
    await user.paste(validJson)
    await user.click(screen.getByRole('button', { name: /load/i }))

    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad.mock.calls[0][0]).toMatchObject({
      name: 'Test',
      chords: [{ symbol: 'C' }],
    })
  })

  it('shows a parse error and does not call onLoad on malformed JSON', async () => {
    const user = userEvent.setup()
    const onLoad = vi.fn()
    render(<LoadPanel onLoad={onLoad} />)

    await user.click(screen.getByRole('textbox'))
    await user.paste('{ this is not json')
    await user.click(screen.getByRole('button', { name: /load/i }))

    expect(onLoad).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid json|parse|syntax/i)
  })

  it('shows a validation error on schema-invalid JSON', async () => {
    const user = userEvent.setup()
    const onLoad = vi.fn()
    render(<LoadPanel onLoad={onLoad} />)

    await user.click(screen.getByRole('textbox'))
    await user.paste('{"chords": []}')
    await user.click(screen.getByRole('button', { name: /load/i }))

    expect(onLoad).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/non-empty/i)
  })
})
