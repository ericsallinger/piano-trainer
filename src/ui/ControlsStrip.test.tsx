import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ControlsStrip } from './ControlsStrip'

const baseProps = {
  onRestart: vi.fn(),
  onReset: vi.fn(),
  onShuffle: vi.fn(),
  canRestart: true,
  canReset: true,
  canShuffle: true,
  tempoEnabled: true,
  bpm: 40,
  onTempoEnabledChange: vi.fn(),
  onBpmChange: vi.fn(),
}

describe('ControlsStrip', () => {
  it('renders Restart and Reset buttons', () => {
    render(<ControlsStrip {...baseProps} />)
    expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('calls onRestart when Restart is clicked', () => {
    const onRestart = vi.fn()
    render(<ControlsStrip {...baseProps} onRestart={onRestart} />)
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(onRestart).toHaveBeenCalledOnce()
  })

  it('calls onReset when Reset is clicked', () => {
    const onReset = vi.fn()
    render(<ControlsStrip {...baseProps} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('shows "Tempo: ON" when tempoEnabled is true', () => {
    render(<ControlsStrip {...baseProps} tempoEnabled={true} />)
    expect(screen.getByRole('button', { name: 'Tempo: ON' })).toBeInTheDocument()
  })

  it('shows "Tempo: OFF" when tempoEnabled is false', () => {
    render(<ControlsStrip {...baseProps} tempoEnabled={false} />)
    expect(screen.getByRole('button', { name: 'Tempo: OFF' })).toBeInTheDocument()
  })

  it('calls onTempoEnabledChange(false) when ON button is clicked', () => {
    const onTempoEnabledChange = vi.fn()
    render(<ControlsStrip {...baseProps} tempoEnabled={true} onTempoEnabledChange={onTempoEnabledChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tempo: ON' }))
    expect(onTempoEnabledChange).toHaveBeenCalledWith(false)
  })

  it('calls onTempoEnabledChange(true) when OFF button is clicked', () => {
    const onTempoEnabledChange = vi.fn()
    render(<ControlsStrip {...baseProps} tempoEnabled={false} onTempoEnabledChange={onTempoEnabledChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tempo: OFF' }))
    expect(onTempoEnabledChange).toHaveBeenCalledWith(true)
  })

  it('shows BPM input with current bpm value', () => {
    render(<ControlsStrip {...baseProps} bpm={60} />)
    expect(screen.getByRole('spinbutton')).toHaveValue(60)
  })

  it('BPM input is not shown when tempoEnabled is false', () => {
    render(<ControlsStrip {...baseProps} tempoEnabled={false} />)
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('calls onBpmChange with parsed integer on valid input', () => {
    const onBpmChange = vi.fn()
    render(<ControlsStrip {...baseProps} onBpmChange={onBpmChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '80' } })
    expect(onBpmChange).toHaveBeenCalledWith(80)
  })

  it('does not call onBpmChange on empty (NaN) input', () => {
    const onBpmChange = vi.fn()
    render(<ControlsStrip {...baseProps} onBpmChange={onBpmChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } })
    expect(onBpmChange).not.toHaveBeenCalled()
  })

  it('allows the input to be cleared without snapping back to the prop value', () => {
    render(<ControlsStrip {...baseProps} bpm={40} onBpmChange={vi.fn()} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } })
    expect(screen.getByRole('spinbutton')).toHaveValue(null)
  })

  it('clamps low values to 20', () => {
    const onBpmChange = vi.fn()
    render(<ControlsStrip {...baseProps} onBpmChange={onBpmChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } })
    expect(onBpmChange).toHaveBeenCalledWith(20)
  })

  it('clamps high values to 300', () => {
    const onBpmChange = vi.fn()
    render(<ControlsStrip {...baseProps} onBpmChange={onBpmChange} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '999' } })
    expect(onBpmChange).toHaveBeenCalledWith(300)
  })
})
