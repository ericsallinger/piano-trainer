import type { ChordSpec } from '../progression/types'

export function matchesChord(heldNotes: ReadonlySet<number>, target: ChordSpec): boolean {
  if (heldNotes.size === 0) return false

  let lowest = Infinity
  const userPCs = new Set<number>()
  for (const note of heldNotes) {
    userPCs.add(((note % 12) + 12) % 12)
    if (note < lowest) lowest = note
  }
  const userBass = ((lowest % 12) + 12) % 12

  if (userBass !== target.bass) return false

  const targetPCs = new Set(target.pitchClasses)
  if (userPCs.size !== targetPCs.size) return false
  for (const pc of userPCs) {
    if (!targetPCs.has(pc)) return false
  }
  return true
}
