import { useEffect, useRef, useState, useCallback } from 'react'
import { WebMidi, type Input, type NoteMessageEvent } from 'webmidi'

export type MidiStatus = 'pending' | 'connected' | 'disconnected' | 'denied'

export interface UseMidiInputResult {
  status: MidiStatus
  deviceNames: string[]
  selectedDeviceId: string | null
  selectedDeviceName: string | null
  selectDevice: (id: string) => void
  heldNotes: ReadonlySet<number>
  /** Monotonic count of noteon events with attack > 0. Use to detect a fresh
   *  keypress vs. a release: noteoffs and velocity-0 noteons do not increment. */
  getNoteOnCount: () => number
}

export function useMidiInput(): UseMidiInputResult {
  const [status, setStatus] = useState<MidiStatus>('pending')
  const [deviceNames, setDeviceNames] = useState<string[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [heldNotes, setHeldNotes] = useState<ReadonlySet<number>>(new Set())
  const heldRef = useRef<Set<number>>(new Set())
  const noteOnCountRef = useRef(0)
  const getNoteOnCount = useCallback(() => noteOnCountRef.current, [])

  const updateHeld = useCallback((mutator: (s: Set<number>) => void) => {
    mutator(heldRef.current)
    setHeldNotes(new Set(heldRef.current))
  }, [])

  const refreshDevices = useCallback(() => {
    setDeviceNames(WebMidi.inputs.map((d) => d.name))
    if (WebMidi.inputs.length === 0) {
      setStatus('disconnected')
      setSelectedDeviceId(null)
    } else {
      setStatus('connected')
      setSelectedDeviceId((prev) => {
        if (prev && WebMidi.inputs.some((d) => d.id === prev)) return prev
        return WebMidi.inputs[0].id
      })
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    WebMidi.enable()
      .then(() => {
        if (cancelled) return
        refreshDevices()
        WebMidi.addListener('connected', refreshDevices)
        WebMidi.addListener('disconnected', refreshDevices)
      })
      .catch(() => {
        if (cancelled) return
        setStatus('denied')
      })

    return () => {
      cancelled = true
      WebMidi.removeListener('connected', refreshDevices)
      WebMidi.removeListener('disconnected', refreshDevices)
    }
  }, [refreshDevices])

  useEffect(() => {
    if (!selectedDeviceId) return

    const input: Input | undefined = WebMidi.inputs.find((d) => d.id === selectedDeviceId)
    if (!input) return

    const onNoteOn = (e: NoteMessageEvent) => {
      if (e.note.attack === 0) {
        updateHeld((s) => s.delete(e.note.number))
      } else {
        noteOnCountRef.current += 1
        updateHeld((s) => s.add(e.note.number))
      }
    }
    const onNoteOff = (e: NoteMessageEvent) => {
      updateHeld((s) => s.delete(e.note.number))
    }

    input.addListener('noteon', onNoteOn)
    input.addListener('noteoff', onNoteOff)

    // Reset held set when switching devices
    heldRef.current = new Set()
    setHeldNotes(new Set())

    return () => {
      input.removeListener('noteon', onNoteOn)
      input.removeListener('noteoff', onNoteOff)
    }
  }, [selectedDeviceId, updateHeld])

  const selectDevice = useCallback((id: string) => {
    setSelectedDeviceId(id)
  }, [])

  const selectedDeviceName =
    WebMidi.inputs.find((d) => d.id === selectedDeviceId)?.name ?? null

  return {
    status,
    deviceNames,
    selectedDeviceId,
    selectedDeviceName,
    selectDevice,
    heldNotes,
    getNoteOnCount,
  }
}
