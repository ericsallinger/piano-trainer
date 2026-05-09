export type Settings = { tempoEnabled: boolean; bpm: number }

const DEFAULTS: Settings = { tempoEnabled: true, bpm: 40 }
const KEY = 'piano-trainer:settings'
const BPM_MIN = 20
const BPM_MAX = 300

function clampBpm(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return DEFAULTS.bpm
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(n)))
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return {
      tempoEnabled: typeof parsed.tempoEnabled === 'boolean'
        ? parsed.tempoEnabled
        : DEFAULTS.tempoEnabled,
      bpm: clampBpm(parsed.bpm),
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}
