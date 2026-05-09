import { useEffect, useRef, useState } from 'react'

interface ProgressionTimerOptions {
  cursor: number
  totalChords: number
  enabled: boolean
}

export function useProgressionTimer({ cursor, totalChords, enabled }: ProgressionTimerOptions) {
  const [startMs, setStartMs] = useState<number | null>(null)
  const [endMs, setEndMs] = useState<number | null>(null)

  // Refs let the effect read the latest timestamps without re-creating the effect.
  const startMsRef = useRef<number | null>(null)
  const endMsRef = useRef<number | null>(null)

  useEffect(() => {
    if (enabled && cursor === 1 && startMsRef.current === null) {
      const t = Date.now()
      startMsRef.current = t
      setStartMs(t)
    }
    if (
      enabled &&
      cursor >= totalChords &&
      totalChords > 0 &&
      startMsRef.current !== null &&
      endMsRef.current === null
    ) {
      const t = Date.now()
      endMsRef.current = t
      setEndMs(t)
    }
  }, [cursor, totalChords, enabled])

  function reset() {
    startMsRef.current = null
    endMsRef.current = null
    setStartMs(null)
    setEndMs(null)
  }

  return { startMs, endMs, reset }
}
