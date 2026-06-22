import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { Progression, ChordSpec } from './progression/types'
import { matchesChord } from './chord/match'
import { createSettleQueue } from './settle/settleQueue'
import { useMidiInput } from './midi/useMidiInput'
import { Header } from './ui/Header'
import { LoadPanel } from './ui/LoadPanel'
import { LibraryPanel } from './ui/LibraryPanel'
import { PromptPanel } from './ui/PromptPanel'
import { ProgressionDisplay, type FlashEvent } from './ui/ProgressionDisplay'
import { ControlsStrip } from './ui/ControlsStrip'
import { useSettings } from './settings/useSettings'
import { useProgressionTimer } from './timing/useProgressionTimer'
import { computeExpectedMs } from './timing/expected'
import { formatDuration, formatDeltaSummary } from './timing/format'
import { recordCompletion } from './library/storage'

const FLASH_DURATION_MS = 500
const SETTLE_WINDOW_MS = 100

export default function App() {
  const midi = useMidiInput()
  const [progression, setProgression] = useState<Progression | null>(null)
  const [currentName, setCurrentName] = useState<string | null>(null)
  const [cursor, setCursor] = useState(0)
  const [flash, setFlash] = useState<FlashEvent | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openPanel, setOpenPanel] = useState<'load' | 'library' | 'prompt' | null>(null)
  const { tempoEnabled, bpm, setTempoEnabled, setBpm } = useSettings()
  const timer = useProgressionTimer({
    cursor,
    totalChords: progression?.chords.length ?? 0,
    enabled: tempoEnabled,
  })

  // Refs let the settle queue's evaluator read the latest target/cursor
  // without the queue itself being recreated on each cursor advance.
  // This is critical: if the queue were recreated, the held-notes useEffect
  // below would re-push the still-held previous-chord notes onto the new
  // queue and trigger a spurious red flash on the next chord before the
  // user has had a chance to release.
  const targetRef = useRef<ChordSpec | null>(null)
  const cursorRef = useRef(0)
  // Tracks the noteon count at the time of the last successful match.
  // Releases (noteoffs) still push the shrinking held set through the settle
  // window, which would otherwise produce a spurious red flash on the next
  // chord. Gating on a fresh noteon since the last match suppresses that.
  const lastMatchedNoteOnCountRef = useRef(0)
  const getNoteOnCount = midi.getNoteOnCount

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
      const noteOnCount = getNoteOnCount()
      if (noteOnCount === lastMatchedNoteOnCountRef.current) return
      const c = cursorRef.current

      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      if (matchesChord(held, t)) {
        lastMatchedNoteOnCountRef.current = noteOnCount
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

  function handleLoad(p: Progression, name: string | null = null) {
    setProgression(p)
    setCurrentName(name)
    setCursor(0)
    setFlash(null)
    settle.cancel()
    timer.reset()
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
    timer.reset()
  }

  function handleReset() {
    setProgression(null)
    setCurrentName(null)
    setCursor(0)
    setFlash(null)
    settle.cancel()
    timer.reset()
  }

  function handleShuffle() {
    if (!progression || progression.chords.length < 2) return
    const shuffled = [...progression.chords]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setProgression({ ...progression, chords: shuffled })
    setCursor(0)
    setFlash(null)
    settle.cancel()
    timer.reset()
  }

  const isComplete = progression !== null && cursor >= progression.chords.length

  const currentNameRef = useRef<string | null>(null)
  const tempoEnabledRef = useRef(tempoEnabled)
  const bpmRef = useRef(bpm)
  useEffect(() => { currentNameRef.current = currentName }, [currentName])
  useEffect(() => { tempoEnabledRef.current = tempoEnabled }, [tempoEnabled])
  useEffect(() => { bpmRef.current = bpm }, [bpm])

  useEffect(() => {
    if (!isComplete) return
    const name = currentNameRef.current
    if (!name) return
    recordCompletion(name, tempoEnabledRef.current ? bpmRef.current : null)
  }, [isComplete])

  let timerSummary: string | null = null
  let timerDetail: string | null = null
  if (isComplete && tempoEnabled && timer.startMs !== null && timer.endMs !== null && progression) {
    const actualMs = timer.endMs - timer.startMs
    const expectedMs = computeExpectedMs(progression.chords.length, bpm)
    timerSummary = formatDeltaSummary(actualMs, expectedMs)
    timerDetail = `Expected ${formatDuration(expectedMs)} · Actual ${formatDuration(actualMs)}`
  }

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
              onChordClick={(i) => { setCursor(i); setFlash(null); settle.cancel(); timer.reset() }}
            />
            {isComplete && <p className="done-indicator">Done!</p>}
            {timerSummary && (
              <div className="timer-result">
                <p className="timer-summary">{timerSummary}</p>
                <p className="timer-detail">{timerDetail}</p>
              </div>
            )}
          </>
        ) : (
          <p className="empty-state">Load a progression to start practicing.</p>
        )}
      </main>

      <div className="app-bottom">
        {openPanel === 'load' && <LoadPanel onLoad={handleLoad} />}
        {openPanel === 'library' && (
          <LibraryPanel
            current={progression}
            onLoad={handleLoad}
            onSaved={(name) => setCurrentName(name)}
          />
        )}
        {openPanel === 'prompt' && <PromptPanel />}
        <div className="bottom-bar">
          <ControlsStrip
            onRestart={handleRestart}
            onReset={handleReset}
            onShuffle={handleShuffle}
            canRestart={true}
            canReset={true}
            canShuffle={progression !== null && progression.chords.length > 1}
            tempoEnabled={tempoEnabled}
            bpm={bpm}
            onTempoEnabledChange={setTempoEnabled}
            onBpmChange={setBpm}
          />
          <div className="panel-toggles">
            <button
              className={`toggle-btn${openPanel === 'load' ? ' toggle-btn--active' : ''}`}
              onClick={() => togglePanel('load')}
            >
              Add
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
