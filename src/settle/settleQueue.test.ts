import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSettleQueue } from './settleQueue'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createSettleQueue', () => {
  it('does not fire before the window elapses', () => {
    const evaluator = vi.fn()
    const queue = createSettleQueue(50, evaluator)
    queue.push(new Set([60]))
    vi.advanceTimersByTime(49)
    expect(evaluator).not.toHaveBeenCalled()
  })

  it('fires once after the window elapses with the latest set', () => {
    const evaluator = vi.fn()
    const queue = createSettleQueue(50, evaluator)
    queue.push(new Set([60]))
    queue.push(new Set([60, 64]))
    queue.push(new Set([60, 64, 67]))
    vi.advanceTimersByTime(50)
    expect(evaluator).toHaveBeenCalledTimes(1)
    expect(evaluator).toHaveBeenCalledWith(new Set([60, 64, 67]))
  })

  it('resets the timer when a new push arrives', () => {
    const evaluator = vi.fn()
    const queue = createSettleQueue(50, evaluator)
    queue.push(new Set([60]))
    vi.advanceTimersByTime(40)
    queue.push(new Set([60, 64]))
    vi.advanceTimersByTime(40)
    expect(evaluator).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10)
    expect(evaluator).toHaveBeenCalledTimes(1)
    expect(evaluator).toHaveBeenCalledWith(new Set([60, 64]))
  })

  it('cancel() prevents pending fires', () => {
    const evaluator = vi.fn()
    const queue = createSettleQueue(50, evaluator)
    queue.push(new Set([60]))
    queue.cancel()
    vi.advanceTimersByTime(100)
    expect(evaluator).not.toHaveBeenCalled()
  })

  it('can fire again after a previous evaluation', () => {
    const evaluator = vi.fn()
    const queue = createSettleQueue(50, evaluator)
    queue.push(new Set([60]))
    vi.advanceTimersByTime(50)
    expect(evaluator).toHaveBeenCalledTimes(1)
    queue.push(new Set([62]))
    vi.advanceTimersByTime(50)
    expect(evaluator).toHaveBeenCalledTimes(2)
    expect(evaluator).toHaveBeenLastCalledWith(new Set([62]))
  })
})
