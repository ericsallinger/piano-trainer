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

const CLAUDE_PROMPT = `Generate a piano chord progression as JSON for my practice app.

Parameters:
- Key: <e.g. C major>
- Length: <e.g. 8 chords>
- Style/notes: <e.g. "jazz ii-V-Is, lots of first-inversion 7th chords">

Output a single JSON object with this exact schema (no prose, no markdown
fences, just the JSON):

{
  "name": "<short descriptive name>",
  "chords": [
    { "symbol": "<chord symbol>", "pitchClasses": [<ints 0-11>], "bass": <int 0-11> }
  ]
}

Conventions:
- pitchClasses uses C=0, C#=1, D=2, ..., B=11. Order within the array doesn't matter.
- bass MUST be one of the values in pitchClasses, and represents the lowest
  pitch class (used to encode inversion).
- For root position chords, bass equals the root's pitch class.
- For inversions, write the symbol with slash notation, e.g. "Cmaj7/E", and set
  bass accordingly.
- Make sure pitchClasses accurately matches the symbol — if you write "Cmaj7"
  the array must contain {0, 4, 7, 11}.

Example:
{ "symbol": "G7/B", "pitchClasses": [7, 11, 2, 5], "bass": 11 }

Now generate the progression for the parameters above.`

export default function App() {
  const midi = useMidiInput()
  const [progression, setProgression] = useState<Progression | null>(null)
  const [cursor, setCursor] = useState(0)
  const [flash, setFlash] = useState<FlashEvent | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openPanel, setOpenPanel] = useState<'load' | 'library' | 'prompt' | null>(null)

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
    setOpenPanel(null)
  }

  function togglePanel(panel: 'load' | 'library' | 'prompt') {
    setOpenPanel(prev => prev === panel ? null : panel)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      handleRestart()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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

      <main className="app-main">
        {progression ? (
          <>
            <ProgressionDisplay
              progression={progression}
              cursor={cursor}
              flash={flash}
              onChordClick={(i) => { setCursor(i); setFlash(null); settle.cancel() }}
            />
            {isComplete && <p className="done-indicator">Done!</p>}
          </>
        ) : (
          <p className="empty-state">Load a progression to start practicing.</p>
        )}
      </main>

      <div className="app-bottom">
        {openPanel === 'load' && <LoadPanel onLoad={handleLoad} />}
        {openPanel === 'library' && <LibraryPanel current={progression} onLoad={handleLoad} />}
        {openPanel === 'prompt' && (
          <section className="panel prompt-panel">
            <h2>Claude prompt</h2>
            <p className="prompt-instructions">Fill in the parameters and paste into Claude, then load the JSON output.</p>
            <textarea readOnly rows={20} value={CLAUDE_PROMPT} />
          </section>
        )}
        <div className="bottom-bar">
          <ControlsStrip
            onRestart={handleRestart}
            onReset={handleReset}
            canRestart={true}
            canReset={true}
          />
          <div className="panel-toggles">
            <button
              className={`toggle-btn${openPanel === 'load' ? ' toggle-btn--active' : ''}`}
              onClick={() => togglePanel('load')}
            >
              Load
            </button>
            <button
              className={`toggle-btn${openPanel === 'library' ? ' toggle-btn--active' : ''}`}
              onClick={() => togglePanel('library')}
            >
              Library
            </button>
            <button
              className={`toggle-btn${openPanel === 'prompt' ? ' toggle-btn--active' : ''}`}
              onClick={() => togglePanel('prompt')}
            >
              Prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
