import { useState } from 'react'
import { loadSettings, saveSettings, type Settings } from './storage'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  function setTempoEnabled(v: boolean) {
    const next = { ...settings, tempoEnabled: v }
    setSettings(next)
    saveSettings(next)
  }

  function setBpm(v: number) {
    const next = { ...settings, bpm: v }
    setSettings(next)
    saveSettings(next)
  }

  return {
    tempoEnabled: settings.tempoEnabled,
    bpm: settings.bpm,
    setTempoEnabled,
    setBpm,
  }
}
