export function formatDuration(ms: number): string {
  const totalSecs = Math.round(ms / 1000)
  const minutes = Math.floor(totalSecs / 60)
  const seconds = totalSecs % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatDelta(actualMs: number, expectedMs: number): string {
  const diffMs = actualMs - expectedMs
  const absDiff = Math.abs(diffMs)
  if (absDiff <= 50) return '(on time)'
  const sign = diffMs > 0 ? '+' : '-'
  const secs = (absDiff / 1000).toFixed(1)
  const label = diffMs > 0 ? 'slow' : 'fast'
  if (expectedMs === 0) return `(${sign}${secs}s)`
  const pct = Math.round((absDiff / expectedMs) * 100)
  return `(${sign}${secs}s, ${pct}% ${label})`
}

export function formatDeltaSummary(actualMs: number, expectedMs: number): string {
  const diffMs = actualMs - expectedMs
  const absDiff = Math.abs(diffMs)
  if (absDiff <= 50) return 'on time'
  const sign = diffMs > 0 ? '+' : '-'
  const label = diffMs > 0 ? 'slow' : 'fast'
  if (expectedMs === 0) return `${sign}${(absDiff / 1000).toFixed(1)}s`
  const pct = Math.round((absDiff / expectedMs) * 100)
  return `${pct}% ${label}`
}
