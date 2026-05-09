# BPM Timer — Design

A toggleable practice feature that times the user playing through a progression and compares their elapsed time to the expected duration based on a user-set BPM. For v1 every chord is treated as a whole note in 4/4. Note-duration controls and time-signature support are explicit future work.

## Goals

- Give the user a quantitative pacing signal at the end of a run: actual time vs. expected time at their chosen BPM.
- Toggleable so users who don't care about tempo see no change.
- BPM and toggle state persist across sessions.
- Implementation matches the existing module pattern in the codebase (one folder per concern, pure functions where possible, hooks for state).

## Non-goals (v1)

- Live mm:ss readout while playing.
- Color-coded delta or judgement of "close enough."
- Audio metronome / click track.
- Per-chord note-duration controls (everything is a whole note).
- Time signatures other than 4/4.

## Timing semantics

### When the timer starts

When the user **correctly matches the first chord**, i.e. when the cursor transitions from `0 → 1`. This is recorded as `startMs = Date.now()`.

Notes played before the first chord matches do not start the clock. Wrong attempts (red flashes) before the first match do not start the clock.

### When the timer stops

When the user correctly matches the **final chord**, i.e. when the cursor reaches `totalChords` (the `complete` state). This is recorded as `endMs = Date.now()`.

### Expected duration

```
expectedMs = (N - 1) × 4 × (60_000 / bpm)
```

where `N` is the number of chords in the progression. The math measures the time between the *downbeat* of the first chord and the *downbeat* of the last chord, which is exactly comparable to the actual elapsed time (both go from first-match to last-match). The final chord's whole-note sustain is not included — the user has reached the last chord, the practice is "done."

For `N = 1` the expected duration is 0 ms. The result line still renders correctly via the formatters' degenerate-case handling.

### Actual duration

```
actualMs = endMs - startMs
```

Both timestamps come from `Date.now()`, which keeps advancing in backgrounded tabs — this is the right behavior (walking away mid-run should be reflected in elapsed time).

## Architecture

Two new modules siblings of `chord/`, `progression/`, `settle/`, `library/`, `midi/`:

### `src/timing/`

Pure timing math and the timer hook.

- **`expected.ts`**
  - `computeExpectedMs(numChords: number, bpm: number): number`
  - Pure. No side effects.

- **`format.ts`**
  - `formatDuration(ms: number): string` → `"0:32"` (mm:ss, rounded to nearest second).
  - `formatDelta(actualMs: number, expectedMs: number): string` → one of:
    - `"(+3.0s, 9% slow)"` when `actualMs > expectedMs` beyond the on-time threshold.
    - `"(-1.5s, 5% fast)"` when `actualMs < expectedMs` beyond the on-time threshold.
    - `"(on time)"` when `|actualMs − expectedMs| ≤ 50 ms`.
    - `"(+1.0s)"` (no percent) when `expectedMs === 0` and `actualMs ≠ 0`. Documented in `format.ts`.
  - Seconds are rendered with one decimal place, percent as integer.

- **`useProgressionTimer.ts`**
  - Signature:
    ```ts
    useProgressionTimer({
      cursor: number,
      totalChords: number,
      enabled: boolean,
    }): { startMs: number | null, endMs: number | null, reset: () => void }
    ```
  - Owns the two timestamps as `useState`.
  - A single `useEffect` keyed on `[cursor, totalChords, enabled]` reads `startMs`/`endMs` from refs (mirroring the `targetRef` / `cursorRef` pattern in `App.tsx`) to decide whether to set them:
    - If `enabled === true && cursor === 1 && startMs === null`: `setStartMs(Date.now())`.
    - If `enabled === true && cursor >= totalChords && totalChords > 0 && startMs !== null && endMs === null`: `setEndMs(Date.now())`.
  - `reset()` clears both. Called by App's `handleRestart`, `handleReset`, and `handleLoad`.

### `src/settings/`

Persisted user settings. Currently just BPM and tempo toggle, designed to grow.

- **`storage.ts`**
  ```ts
  type Settings = { tempoEnabled: boolean; bpm: number }
  const DEFAULTS: Settings = { tempoEnabled: true, bpm: 40 }
  function loadSettings(): Settings
  function saveSettings(s: Settings): void
  ```
  - localStorage key: `piano-trainer:settings` (matches the prefix style used in `library/`).
  - On load: missing/invalid JSON → defaults. Missing fields → fill from defaults. BPM clamped to `[20, 300]` (defensive against hand-edited storage).

- **`useSettings.ts`**
  - Reads from `loadSettings()` on mount, exposes `{ tempoEnabled, bpm, setTempoEnabled, setBpm }`, writes through to `saveSettings` on every change.

### Touched files

- `src/App.tsx` — Wire `useSettings` and `useProgressionTimer` together. Pass settings to `ControlsStrip`. Render result line under "Done!". Call `timer.reset()` from `handleLoad`, `handleRestart`, `handleReset`.
- `src/ui/ControlsStrip.tsx` — Add the tempo toggle button and BPM input next to Reset.
- `src/App.css` — Styles for the new tempo controls group and the result line.

## UI

### Controls strip (bottom bar)

```
[Restart] [Reset] | [Tempo: ON]  [BPM 40]
```

The vertical separator is a `border-left` on a `.tempo-controls` group so the tempo controls feel distinct from the practice controls.

- **Tempo toggle button** — Re-uses the existing `toggle-btn` class. Label switches between `Tempo: ON` and `Tempo: OFF`. Applies `toggle-btn--active` when ON.
- **BPM input** — `<input type="number" min="20" max="300" step="1">` with a small `BPM` label. About 50 px wide. `disabled` when tempo is OFF (the value is meaningless then). Editable any time tempo is ON, including mid-progression.
- Both controls are always present in the DOM, regardless of whether a progression is loaded.

### Component contract change

```ts
interface ControlsStripProps {
  onRestart: () => void
  onReset: () => void
  canRestart: boolean
  canReset: boolean
  // new:
  tempoEnabled: boolean
  bpm: number
  onTempoEnabledChange: (v: boolean) => void
  onBpmChange: (v: number) => void
}
```

The `onBpmChange` handler ignores `NaN` and clamps the value to `[20, 300]` before propagating.

### End-of-progression result

When `isComplete` is true:

```
Done!
Expected 0:32 · Actual 0:35  (+3.0s, 9% slow)
```

The result line renders only when **all three** are true:

1. `tempoEnabled === true` at completion time.
2. `startMs !== null` (the timer started — i.e. the user did not click-jump past chord 1).
3. `endMs !== null` (the timer stopped — i.e. tempo was not toggled off mid-run).

If any of these is false, only `Done!` renders, matching current behavior.

The expected value is recomputed live from the current BPM, so adjusting BPM while the result is on screen updates the expected display via React's normal re-render. This is the simplest reactive behavior and is intentional.

### CSS additions to `App.css`

```css
.tempo-controls {
  border-left: 1px solid #ccc;
  padding-left: 12px;
  margin-left: 4px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.bpm-input {
  width: 50px;
  padding: 4px 6px;
}

.tempo-controls label {
  font-size: 13px;
}

.timer-result {
  font-size: 14px;
  color: #666;
  margin-top: -8px;
}
```

## Lifecycle

1. **App mounts.** `useSettings` reads `localStorage`. `useProgressionTimer` initializes with `startMs = null, endMs = null`.

2. **User edits BPM or toggles tempo.** Setter writes through to `localStorage` immediately. No effect on a running timer; BPM is read at completion time.

3. **User loads a progression** (`handleLoad`). Existing reset logic plus `timer.reset()`.

4. **User correctly plays the first chord.** Cursor `0 → 1`. The hook's effect sees `enabled === true && cursor === 1 && startMs === null` and sets `startMs`.

5. **User correctly plays middle chords.** No effect on the timer.

6. **User correctly plays the final chord.** Cursor reaches `totalChords`. The hook's effect sees the end conditions and sets `endMs`.

7. **App renders the complete state.** If the result-display conditions hold, the result line renders with `formatDuration(expectedMs)`, `formatDuration(actualMs)`, and `formatDelta(actualMs, expectedMs)`.

8. **User clicks Restart.** `handleRestart` calls `timer.reset()` in addition to existing logic. The next `0 → 1` starts a fresh measurement.

9. **User clicks Reset.** `handleReset` calls `timer.reset()`. Same outcome from the timer's perspective.

## Edge cases

- **Tempo toggled OFF mid-progression after the timer started.** The hook stops triggering, so `endMs` is never set. Completion shows only `Done!`. The leftover `startMs` is cleared on the next Restart/Reset/Load.

- **Tempo toggled ON mid-progression after chord 1 was already matched.** The start condition (`cursor === 1 && startMs === null`) is no longer reachable this run. Timer does not engage retroactively. User must Restart for a clean run.

- **User clicks a chord to scrub.** Backward jumps preserve `startMs`. The timer keeps running. If the user then reaches the end normally, elapsed time includes the scrubbed period — a known quirk of an existing debug-affordance feature. Restart is the supported way to retime.

- **Single-chord progression** (`N === 1`). Cursor goes `0 → 1`, which equals `totalChords`. Both start and end conditions fire on the same render. `startMs` and `endMs` end up at essentially the same `Date.now()` value. `actualMs ≈ 0`, `expectedMs = 0`. Result line renders `Expected 0:00 · Actual 0:00 (on time)`. Covered by a unit test.

- **BPM input set to invalid value** (negative, NaN from cleared input). The input's `min`/`max`/`step` attributes plus an `onBpmChange` that ignores `NaN` and clamps to `[20, 300]` keep state safe. `loadSettings` applies the same clamp on read.

- **Browser tab backgrounded mid-progression.** `Date.now()` continues advancing in background tabs. Elapsed time reflects real wall-clock time — correct behavior.

- **Page refresh mid-progression.** Cursor and timer state are in-memory only and clear on refresh. BPM and toggle persist via `localStorage`. Matches existing v1 behavior.

## Testing strategy

### Unit tests — `timing/expected.test.ts`

- `computeExpectedMs(2, 60) === 4000`
- `computeExpectedMs(4, 60) === 12000`
- `computeExpectedMs(8, 40) === 42000`
- `computeExpectedMs(1, 60) === 0`
- `computeExpectedMs(2, 120) === 2000`

### Unit tests — `timing/format.test.ts`

`formatDuration`:

- `0` → `"0:00"`
- `4000` → `"0:04"`
- `42000` → `"0:42"`
- `65000` → `"1:05"`
- `599000` → `"9:59"`
- `3500` → `"0:04"` (rounding to nearest second)

`formatDelta`:

- `(35000, 32000)` → `"(+3.0s, 9% slow)"`
- `(30500, 32000)` → `"(-1.5s, 5% fast)"`
- `(32000, 32000)` → `"(on time)"`
- `(32030, 32000)` → `"(on time)"` (within 50 ms threshold)
- `(0, 0)` → `"(on time)"`
- `(1000, 0)` → `"(+1.0s)"` (no percent when expected is zero)

### Unit tests — `settings/storage.test.ts`

- Empty localStorage → `{ tempoEnabled: true, bpm: 40 }`.
- Round-trip via `saveSettings` / `loadSettings`.
- Malformed JSON → defaults.
- Out-of-range BPM (`5`, `9999`, `"abc"`) → clamps or defaults to a valid value.
- Missing fields (`{}`, `{ bpm: 60 }`) → fill from defaults.
- `saveSettings` writes once per call (via `vi.spyOn(Storage.prototype, 'setItem')`).

### Hook tests — `timing/useProgressionTimer.test.tsx`

Use `renderHook` and `act` from `@testing-library/react`, plus `vi.useFakeTimers()` and `vi.setSystemTime` to advance `Date.now()` deterministically.

- Cursor `0 → 1` with `enabled: true` sets `startMs`, leaves `endMs` null.
- Cursor `0 → 1` with `enabled: false` leaves both null.
- Cursor passing through middle chords leaves `endMs` null.
- Cursor reaching `totalChords` after a started timer with `enabled: true` sets `endMs`. `endMs - startMs` matches advanced fake time.
- Toggling `enabled` to `false` after start prevents `endMs` from being set on completion.
- `reset()` clears both. A subsequent `0 → 1` starts a fresh measurement.
- Single-chord progression (`totalChords === 1`): cursor `0 → 1` populates both `startMs` and `endMs`, with `endMs >= startMs`.
- Cursor jumps backward (e.g., `3 → 0`) do not clear `startMs`. Subsequent `0 → 1` does not overwrite the existing `startMs`.

### Hook tests — `settings/useSettings.test.tsx`

- Initial render with seeded localStorage returns the seeded values.
- Initial render with empty storage returns defaults.
- `setBpm(80)` updates the returned value and writes to localStorage.
- `setTempoEnabled(false)` updates the returned value and writes to localStorage.

### Component tests — `ui/ControlsStrip.test.tsx` (new file)

- Renders Restart/Reset (existing behavior preserved).
- Renders the tempo toggle with label reflecting `tempoEnabled`.
- Clicking the toggle calls `onTempoEnabledChange` with the inverted value.
- Renders the BPM input with the current `bpm`.
- Typing in the BPM input calls `onBpmChange` with the parsed integer.
- BPM input is `disabled` when `tempoEnabled === false`.
- Typing values outside `[20, 300]` does not propagate out of range — verified by `onBpmChange` not being called with bad values, or being called only with the clamped value.

### Manual integration test additions to README

Append to the existing checklist:

12. With Tempo ON and BPM = 60, load the 3-chord test progression. Play through it. After "Done!" appears, verify a result line shows `Expected 0:08 · Actual <your time> (delta)`. (8 seconds = (3 − 1) × 4 × 1.0 s.)
13. Click Restart, change BPM to 120, play through again. Verify expected updates to `0:04`.
14. Toggle Tempo OFF. Click Restart, play through. Verify only "Done!" appears, no result line.
15. Toggle Tempo ON, play the first chord, then toggle Tempo OFF mid-progression. Finish playing. Verify no result line (since `endMs` was never captured).
16. Refresh the page. Verify BPM and toggle state are preserved.
17. Set BPM to invalid values (clear the input, type `0`, type `9999`). Verify the input clamps or rejects gracefully.

### Out of scope for tests

- Real MIDI hardware timing accuracy — covered by the manual checklist.
- Sub-millisecond `Date.now()` precision.
- React 18 strict-mode double-effect interactions — the hook is idempotent under double-invocation by construction (uses refs and null-guarded state setters).

## Future enhancements

- Per-chord note durations (half notes, quarter notes, dotted notes).
- Time signatures other than 4/4.
- Live mm:ss readout during play.
- Color-coded delta with user-tunable "close enough" threshold.
- Audio metronome / click track.
- Per-progression best-time tracking (saved alongside the library entry).
