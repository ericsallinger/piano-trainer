export function computeExpectedMs(numChords: number, bpm: number): number {
  return (numChords - 1) * 4 * (60_000 / bpm)
}
