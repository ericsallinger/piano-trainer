import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { Progression, ChordSpec } from './progression/types'
import { matchesChord } from './chord/match'
import { createSettleQueue } from './settle/settleQueue'
import { useMidiInput } from './midi/useMidiInput'
import { Header } from './ui/Header'
import { LoadPanel } from './ui/LoadPanel'
import { LibraryPanel } from './ui/LibraryPanel'
import { ProgressionDisplay, type FlashEvent } from './ui/ProgressionDisplay'
import { ControlsStrip } from './ui/ControlsStrip'

const FLASH_DURATION_MS = 500
const SETTLE_WINDOW_MS = 50

export default function App() {
  const midi = useMidiInput()
  const [progression, setProgression] = useState<Progression | null>(null)
  const [cursor, setCursor] = useState(0)
  const [flash, setFlash] = useState<FlashEvent | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs let the settle queue's evaluator read the latest target/cursor
  // without the queue itself being recreated on each cursor advance.
  // This is critical: if the queue were recreated, the held-notes useEffect
  // below would re-push the still-held previous-chord notes onto the new
  // queue and trigger a spurious red flash on the next chord before the
  // user has had a chance to release.
  const targetRef = useRef<ChordSpec | null>(null)
  const cursorRef = useRef(0)

  const target = progression && cursor < progression.chords.length
    ? progression.chords[cursor]
    : null

  useEffect(() => { targetRef.current = target }, [target])
  useEffect(() => { cursorRef.current = cursor }, [cursor])

  // Stable settle queue for the lifetime of the component.
  const settle = useMemo(() => {
    return createSettleQueue(SETTLE_WINDOW_MS, (held) => {
      const t = targetRef.current
      if (!t || held.size === 0) return
      const c = cursorRef.current

      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      if (matchesChord(held, t)) {
        setFlash({ color: 'green', onIndex: c })
        flashTimerRef.current = setTimeout(() => setFlash(null), FLASH_DURATION_MS)
        setCursor((cur) => cur + 1)
      } else {
        setFlash({ color: 'red', onIndex: c })
        flashTimerRef.current = setTimeout(() => setFlash(null), FLASH_DURATION_MS)
      }
    })
  }, [])

  // Push held-notes changes into the settle queue. Because `settle` is
  // stable and `midi.heldNotes` is a fresh Set only when MIDI state actually
  // changes, this effect re-runs only on real input transitions.
  useEffect(() => {
    settle.push(midi.heldNotes)
  }, [midi.heldNotes, settle])

  function handleLoad(p: Progression) {
    setProgression(p)
    setCursor(0)
    setFlash(null)
    settle.cancel()
  }

  function handleRestart() {
    setCursor(0)
    setFlash(null)
    settle.cancel()
  }

  function handleReset() {
    setProgression(null)
    setCursor(0)
    setFlash(null)
    settle.cancel()
  }

  const isComplete = progression !== null && cursor >= progression.chords.length

  return (
    <div className="app">
      <Header
        deviceNames={midi.deviceNames}
        selectedDeviceId={midi.selectedDeviceId}
        onSelectDevice={midi.selectDevice}
        status={midi.status}
        selectedDeviceName={midi.selectedDeviceName}
      />

      {progression ? (
        <>
          <ProgressionDisplay progression={progression} cursor={cursor} flash={flash} />
          {isComplete && <p className="done-indicator">Done!</p>}
          <ControlsStrip
            onRestart={handleRestart}
            onReset={handleReset}
            canRestart={true}
            canReset={true}
          />
        </>
      ) : (
        <p className="empty-state">Load a progression below to start practicing.</p>
      )}

      <LoadPanel onLoad={handleLoad} />
      <LibraryPanel current={progression} onLoad={handleLoad} />
    </div>
  )
}
