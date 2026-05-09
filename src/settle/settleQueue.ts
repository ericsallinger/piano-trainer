export interface SettleQueue {
  push(heldNotes: ReadonlySet<number>): void
  cancel(): void
}

export function createSettleQueue(
  windowMs: number,
  evaluator: (heldNotes: ReadonlySet<number>) => void,
): SettleQueue {
  let timer: ReturnType<typeof setTimeout> | null = null
  let latest: ReadonlySet<number> = new Set()

  function clear() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return {
    push(heldNotes) {
      latest = heldNotes
      clear()
      timer = setTimeout(() => {
        timer = null
        evaluator(latest)
      }, windowMs)
    },
    cancel() {
      clear()
    },
  }
}
