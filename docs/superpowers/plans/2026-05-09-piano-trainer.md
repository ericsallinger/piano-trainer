# Piano Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based piano chord practice app: load a progression as JSON, play each chord on a MIDI controller, get real-time green/red feedback, advance only when correct.

**Architecture:** Single-page React + TypeScript app, no backend. Web MIDI API via the `webmidi` library reads input. Pure chord-matching logic compares pitch-class sets and bass notes. Browser localStorage stores a named library of progressions.

**Tech Stack:** React 18, TypeScript 5, Vite, Vitest + @testing-library/react + jsdom, `webmidi` 3.x for MIDI input.

**Reference spec:** `docs/superpowers/specs/2026-05-09-piano-trainer-design.md`

---

## File Structure

```
piano-trainer/
├── README.md                                    # Setup, Claude prompt template, manual test checklist
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── vitest.setup.ts                              # @testing-library/jest-dom setup
├── index.html
├── src/
│   ├── main.tsx                                 # React entry point
│   ├── App.tsx                                  # Top-level layout, state machine, wiring
│   ├── App.css                                  # Plain CSS for the app
│   ├── progression/
│   │   ├── types.ts                             # Progression, ChordSpec types
│   │   ├── validate.ts                          # JSON validation → Progression
│   │   └── validate.test.ts
│   ├── chord/
│   │   ├── match.ts                             # Pure matchesChord(held, target) → boolean
│   │   └── match.test.ts
│   ├── settle/
│   │   ├── settleQueue.ts                       # 50 ms debounce factory
│   │   └── settleQueue.test.ts
│   ├── library/
│   │   ├── storage.ts                           # localStorage CRUD
│   │   └── storage.test.ts
│   ├── midi/
│   │   └── useMidiInput.ts                      # React hook wrapping `webmidi`
│   └── ui/
│       ├── ChordSymbol.tsx
│       ├── ChordSymbol.test.tsx
│       ├── ProgressionDisplay.tsx
│       ├── ProgressionDisplay.test.tsx
│       ├── LoadPanel.tsx
│       ├── LoadPanel.test.tsx
│       ├── LibraryPanel.tsx
│       ├── LibraryPanel.test.tsx
│       ├── Header.tsx
│       └── ControlsStrip.tsx
└── docs/superpowers/
    ├── specs/2026-05-09-piano-trainer-design.md
    └── plans/2026-05-09-piano-trainer.md        # this file
```

---

## Task 1: Bootstrap project (Vite + React + TS + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/App.css`, `.gitignore`

- [ ] **Step 1: Scaffold with Vite's React+TS template**

Run:
```bash
npm create vite@latest . -- --template react-ts
```

When prompted to confirm scaffolding into a non-empty directory, answer "Ignore files and continue".

- [ ] **Step 2: Install runtime + dev dependencies**

Run:
```bash
npm install webmidi
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add test script**

Modify `package.json` — add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Add a smoke test to confirm Vitest works**

Create `src/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Replace scaffolded App with empty shell**

Replace `src/App.tsx`:

```tsx
import './App.css'

export default function App() {
  return <div className="app">Piano Trainer</div>
}
```

Replace `src/App.css`:

```css
:root {
  font-family: system-ui, -apple-system, sans-serif;
  color-scheme: light dark;
}

body {
  margin: 0;
}

.app {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
}
```

Delete `src/index.css` (created by Vite scaffold), and remove its import from `src/main.tsx`. Final `src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Also delete `src/assets/` (the Vite logo) and any references in `App.tsx`/`App.css`.

- [ ] **Step 7: Verify build + dev server**

Run:
```bash
npm run build
```
Expected: build succeeds with no TS errors.

Run:
```bash
npm test
```
Expected: smoke test passes.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "Bootstrap Vite + React + TS + Vitest scaffold"
```

---

## Task 2: Progression types

**Files:**
- Create: `src/progression/types.ts`

- [ ] **Step 1: Write the type definitions**

Create `src/progression/types.ts`:

```ts
export interface ChordSpec {
  symbol: string
  pitchClasses: number[]
  bass: number
}

export interface Progression {
  name?: string
  chords: ChordSpec[]
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/progression/types.ts
git commit -m "Add Progression and ChordSpec types"
```

---

## Task 3: Progression JSON validation

**Files:**
- Create: `src/progression/validate.ts`, `src/progression/validate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/progression/validate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateProgression } from './validate'

describe('validateProgression', () => {
  const valid = {
    name: 'Test',
    chords: [
      { symbol: 'Cmaj7', pitchClasses: [0, 4, 7, 11], bass: 0 },
    ],
  }

  it('accepts a minimal valid progression', () => {
    const result = validateProgression(valid)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.progression.chords).toHaveLength(1)
  })

  it('accepts a progression without a name', () => {
    const { name, ...withoutName } = valid
    const result = validateProgression(withoutName)
    expect(result.ok).toBe(true)
  })

  it('rejects non-object input', () => {
    expect(validateProgression(null).ok).toBe(false)
    expect(validateProgression('hi').ok).toBe(false)
    expect(validateProgression(42).ok).toBe(false)
  })

  it('rejects an empty chords array', () => {
    const result = validateProgression({ chords: [] })
    expect(result.ok).toBe(false)
  })

  it('rejects a missing chords field', () => {
    const result = validateProgression({})
    expect(result.ok).toBe(false)
  })

  it('rejects a chord with an empty symbol', () => {
    const result = validateProgression({
      chords: [{ symbol: '', pitchClasses: [0, 4, 7], bass: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a chord with a pitch class out of range', () => {
    const result = validateProgression({
      chords: [{ symbol: 'X', pitchClasses: [0, 12], bass: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a chord with duplicate pitch classes', () => {
    const result = validateProgression({
      chords: [{ symbol: 'X', pitchClasses: [0, 0, 7], bass: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects a chord whose bass is not in pitchClasses', () => {
    const result = validateProgression({
      chords: [{ symbol: 'Cmaj7', pitchClasses: [0, 4, 7, 11], bass: 5 }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects pitchClasses with a non-integer value', () => {
    const result = validateProgression({
      chords: [{ symbol: 'X', pitchClasses: [0, 4.5, 7], bass: 0 }],
    })
    expect(result.ok).toBe(false)
  })

  it('returns an error message describing the first problem', () => {
    const result = validateProgression({ chords: [] })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(typeof result.error).toBe('string')
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run src/progression/validate.test.ts`
Expected: all tests fail with "validateProgression is not a function" or import error.

- [ ] **Step 3: Implement validateProgression**

Create `src/progression/validate.ts`:

```ts
import type { Progression, ChordSpec } from './types'

export type ValidationResult =
  | { ok: true; progression: Progression }
  | { ok: false; error: string }

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n)
}

function isPitchClass(n: unknown): n is number {
  return isInt(n) && n >= 0 && n <= 11
}

function validateChord(input: unknown, index: number): ChordSpec | string {
  if (typeof input !== 'object' || input === null) {
    return `chords[${index}] is not an object`
  }
  const c = input as Record<string, unknown>

  if (typeof c.symbol !== 'string' || c.symbol.length === 0) {
    return `chords[${index}].symbol must be a non-empty string`
  }
  if (!Array.isArray(c.pitchClasses) || c.pitchClasses.length === 0 || c.pitchClasses.length > 12) {
    return `chords[${index}].pitchClasses must be an array of 1-12 items`
  }
  for (const pc of c.pitchClasses) {
    if (!isPitchClass(pc)) {
      return `chords[${index}].pitchClasses contains a non-integer or out-of-range value`
    }
  }
  const seen = new Set<number>()
  for (const pc of c.pitchClasses as number[]) {
    if (seen.has(pc)) return `chords[${index}].pitchClasses has a duplicate`
    seen.add(pc)
  }
  if (!isPitchClass(c.bass)) {
    return `chords[${index}].bass must be an integer 0-11`
  }
  if (!seen.has(c.bass as number)) {
    return `chords[${index}].bass must be one of pitchClasses`
  }

  return {
    symbol: c.symbol,
    pitchClasses: [...(c.pitchClasses as number[])],
    bass: c.bass as number,
  }
}

export function validateProgression(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, error: 'input must be a JSON object' }
  }
  const obj = input as Record<string, unknown>

  if (obj.name !== undefined && typeof obj.name !== 'string') {
    return { ok: false, error: 'name must be a string when present' }
  }

  if (!Array.isArray(obj.chords)) {
    return { ok: false, error: 'chords must be an array' }
  }
  if (obj.chords.length === 0) {
    return { ok: false, error: 'chords must be non-empty' }
  }

  const chords: ChordSpec[] = []
  for (let i = 0; i < obj.chords.length; i++) {
    const result = validateChord(obj.chords[i], i)
    if (typeof result === 'string') return { ok: false, error: result }
    chords.push(result)
  }

  return {
    ok: true,
    progression: {
      ...(typeof obj.name === 'string' ? { name: obj.name } : {}),
      chords,
    },
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npx vitest run src/progression/validate.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/progression/
git commit -m "Add Progression JSON validation with full coverage"
```

---

## Task 4: Chord matching algorithm

**Files:**
- Create: `src/chord/match.ts`, `src/chord/match.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/chord/match.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchesChord } from './match'
import type { ChordSpec } from '../progression/types'

const Cmaj7: ChordSpec  = { symbol: 'Cmaj7',  pitchClasses: [0, 4, 7, 11], bass: 0 }
const Cmaj7E: ChordSpec = { symbol: 'Cmaj7/E', pitchClasses: [0, 4, 7, 11], bass: 4 }
const G7: ChordSpec     = { symbol: 'G7',     pitchClasses: [7, 11, 2, 5], bass: 7 }
const C: ChordSpec      = { symbol: 'C',      pitchClasses: [0, 4, 7],     bass: 0 }
const single: ChordSpec = { symbol: 'C',      pitchClasses: [0],           bass: 0 }

describe('matchesChord', () => {
  it('returns false for an empty held set', () => {
    expect(matchesChord(new Set(), Cmaj7)).toBe(false)
  })

  it('matches an exact root-position voicing', () => {
    // C4=60, E4=64, G4=67, B4=71
    expect(matchesChord(new Set([60, 64, 67, 71]), Cmaj7)).toBe(true)
  })

  it('matches with octave doublings of any pitch class', () => {
    // C3=48, C4=60, E4=64, G4=67, B4=71
    expect(matchesChord(new Set([48, 60, 64, 67, 71]), Cmaj7)).toBe(true)
    // also: doubled E and G
    expect(matchesChord(new Set([48, 60, 64, 67, 71, 76, 79]), Cmaj7)).toBe(true)
  })

  it('rejects when a foreign pitch class is added', () => {
    // adding D (62) which is pitch class 2
    expect(matchesChord(new Set([60, 62, 64, 67, 71]), Cmaj7)).toBe(false)
  })

  it('rejects when a required pitch class is missing', () => {
    // missing B (11)
    expect(matchesChord(new Set([60, 64, 67]), Cmaj7)).toBe(false)
  })

  it('rejects when bass is wrong even with right pitch classes (root vs first inversion)', () => {
    // root position notes but target requires E in bass
    expect(matchesChord(new Set([60, 64, 67, 71]), Cmaj7E)).toBe(false)
  })

  it('matches first inversion when bass is correct', () => {
    // E3=52 (lowest), G3=55, B3=59, C4=60
    expect(matchesChord(new Set([52, 55, 59, 60]), Cmaj7E)).toBe(true)
  })

  it('matches a triad without 7th', () => {
    expect(matchesChord(new Set([60, 64, 67]), C)).toBe(true)
  })

  it('rejects a triad that has an extra 7th', () => {
    expect(matchesChord(new Set([60, 64, 67, 71]), C)).toBe(false)
  })

  it('matches a single-note "chord"', () => {
    expect(matchesChord(new Set([60]), single)).toBe(true)
    expect(matchesChord(new Set([72]), single)).toBe(true)
    expect(matchesChord(new Set([60, 64]), single)).toBe(false)
  })

  it('matches G7 with various voicings', () => {
    // G3=55, B3=59, D4=62, F4=65
    expect(matchesChord(new Set([55, 59, 62, 65]), G7)).toBe(true)
    // doubled root, F lower
    expect(matchesChord(new Set([55, 65, 67, 71, 74]), G7)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run src/chord/match.test.ts`
Expected: all tests fail (matchesChord undefined).

- [ ] **Step 3: Implement matchesChord**

Create `src/chord/match.ts`:

```ts
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
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npx vitest run src/chord/match.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/chord/
git commit -m "Add pure chord matching with pitch-class set + bass check"
```

---

## Task 5: Settle-window debounce queue

**Files:**
- Create: `src/settle/settleQueue.ts`, `src/settle/settleQueue.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/settle/settleQueue.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSettleQueue } from './settleQueue'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createSettleQueue', () => {
  it('does not fire before the window elapses', () => {
    const evaluator = vi.fn()
    const queue = createSettleQueue(50, evaluator)
    queue.push(new Set([60]))
    vi.advanceTimersByTime(49)
    expect(evaluator).not.toHaveBeenCalled()
  })

  it('fires once after the window elapses with the latest set', () => {
    const evaluator = vi.fn()
    const queue = createSettleQueue(50, evaluator)
    queue.push(new Set([60]))
    queue.push(new Set([60, 64]))
    queue.push(new Set([60, 64, 67]))
    vi.advanceTimersByTime(50)
    expect(evaluator).toHaveBeenCalledTimes(1)
    expect(evaluator).toHaveBeenCalledWith(new Set([60, 64, 67]))
  })

  it('resets the timer when a new push arrives', () => {
    const evaluator = vi.fn()
    const queue = createSettleQueue(50, evaluator)
    queue.push(new Set([60]))
    vi.advanceTimersByTime(40)
    queue.push(new Set([60, 64]))
    vi.advanceTimersByTime(40)
    expect(evaluator).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10)
    expect(evaluator).toHaveBeenCalledTimes(1)
    expect(evaluator).toHaveBeenCalledWith(new Set([60, 64]))
  })

  it('cancel() prevents pending fires', () => {
    const evaluator = vi.fn()
    const queue = createSettleQueue(50, evaluator)
    queue.push(new Set([60]))
    queue.cancel()
    vi.advanceTimersByTime(100)
    expect(evaluator).not.toHaveBeenCalled()
  })

  it('can fire again after a previous evaluation', () => {
    const evaluator = vi.fn()
    const queue = createSettleQueue(50, evaluator)
    queue.push(new Set([60]))
    vi.advanceTimersByTime(50)
    expect(evaluator).toHaveBeenCalledTimes(1)
    queue.push(new Set([62]))
    vi.advanceTimersByTime(50)
    expect(evaluator).toHaveBeenCalledTimes(2)
    expect(evaluator).toHaveBeenLastCalledWith(new Set([62]))
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run src/settle/settleQueue.test.ts`
Expected: all tests fail.

- [ ] **Step 3: Implement createSettleQueue**

Create `src/settle/settleQueue.ts`:

```ts
export interface SettleQueue {
  push(heldNotes: ReadonlySet<number>): void
  cancel(): void
}

export function createSettleQueue(
  windowMs: number,
  evaluator: (heldNotes: ReadonlySet<number>) => void,
): SettleQueue {
  let timer: ReturnType<typeof setTimeout> | null = null
  let latest: ReadonlySet<number> = new Set()

  function clear() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return {
    push(heldNotes) {
      latest = heldNotes
      clear()
      timer = setTimeout(() => {
        timer = null
        evaluator(latest)
      }, windowMs)
    },
    cancel() {
      clear()
    },
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npx vitest run src/settle/settleQueue.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/settle/
git commit -m "Add settle-window debounce queue with fake-timer tests"
```

---

## Task 6: Library localStorage CRUD

**Files:**
- Create: `src/library/storage.ts`, `src/library/storage.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/library/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveProgression,
  loadProgression,
  listProgressions,
  deleteProgression,
} from './storage'
import type { Progression } from '../progression/types'

const example: Progression = {
  name: 'Example',
  chords: [{ symbol: 'C', pitchClasses: [0, 4, 7], bass: 0 }],
}

beforeEach(() => {
  localStorage.clear()
})

describe('library storage', () => {
  it('saves and loads a progression by name', () => {
    const r = saveProgression('Test1', example)
    expect(r.ok).toBe(true)
    expect(loadProgression('Test1')).toEqual(example)
  })

  it('returns null for an unknown name', () => {
    expect(loadProgression('Nope')).toBeNull()
  })

  it('lists saved names sorted alphabetically', () => {
    saveProgression('Charlie', example)
    saveProgression('Alpha', example)
    saveProgression('Bravo', example)
    expect(listProgressions()).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('deletes a progression', () => {
    saveProgression('ToDelete', example)
    deleteProgression('ToDelete')
    expect(loadProgression('ToDelete')).toBeNull()
    expect(listProgressions()).not.toContain('ToDelete')
  })

  it('overwrites an existing entry on save with the same name', () => {
    saveProgression('Same', example)
    const updated: Progression = {
      name: 'Same',
      chords: [{ symbol: 'F', pitchClasses: [5, 9, 0], bass: 5 }],
    }
    saveProgression('Same', updated)
    expect(loadProgression('Same')).toEqual(updated)
    expect(listProgressions()).toEqual(['Same'])
  })

  it('rejects an empty name', () => {
    const r = saveProgression('', example)
    expect(r.ok).toBe(false)
  })

  it('returns an error result if localStorage throws (quota exceeded)', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      const err = new Error('quota')
      ;(err as Error & { name: string }).name = 'QuotaExceededError'
      throw err
    }
    try {
      const r = saveProgression('Big', example)
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/quota|storage/i)
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run src/library/storage.test.ts`
Expected: all tests fail.

- [ ] **Step 3: Implement storage**

Create `src/library/storage.ts`:

```ts
import type { Progression } from '../progression/types'

const PREFIX = 'pianoTrainer:progression:'

export type SaveResult = { ok: true } | { ok: false; error: string }

export function saveProgression(name: string, progression: Progression): SaveResult {
  if (name.length === 0) return { ok: false, error: 'Name cannot be empty' }
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(progression))
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return { ok: false, error: `Storage error: ${msg}` }
  }
}

export function loadProgression(name: string): Progression | null {
  const raw = localStorage.getItem(PREFIX + name)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as Progression
  } catch {
    return null
  }
}

export function listProgressions(): string[] {
  const names: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(PREFIX)) {
      names.push(key.slice(PREFIX.length))
    }
  }
  return names.sort((a, b) => a.localeCompare(b))
}

export function deleteProgression(name: string): void {
  localStorage.removeItem(PREFIX + name)
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npx vitest run src/library/storage.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/library/
git commit -m "Add library localStorage CRUD with name-prefix keys"
```

---

## Task 7: ChordSymbol component

**Files:**
- Create: `src/ui/ChordSymbol.tsx`, `src/ui/ChordSymbol.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/ChordSymbol.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ChordSymbol } from './ChordSymbol'

describe('<ChordSymbol>', () => {
  it('renders the symbol text', () => {
    const { getByText } = render(<ChordSymbol symbol="Cmaj7" state="upcoming" />)
    expect(getByText('Cmaj7')).toBeInTheDocument()
  })

  it('applies the current class when state=current', () => {
    const { getByText } = render(<ChordSymbol symbol="G7" state="current" />)
    expect(getByText('G7')).toHaveClass('chord--current')
  })

  it('applies the completed class when state=completed', () => {
    const { getByText } = render(<ChordSymbol symbol="F" state="completed" />)
    expect(getByText('F')).toHaveClass('chord--completed')
  })

  it('applies the flash-green class when flash=green', () => {
    const { getByText } = render(<ChordSymbol symbol="C" state="current" flash="green" />)
    expect(getByText('C')).toHaveClass('chord--flash-green')
  })

  it('applies the flash-red class when flash=red', () => {
    const { getByText } = render(<ChordSymbol symbol="C" state="current" flash="red" />)
    expect(getByText('C')).toHaveClass('chord--flash-red')
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run src/ui/ChordSymbol.test.tsx`
Expected: tests fail (component undefined).

- [ ] **Step 3: Implement ChordSymbol**

Create `src/ui/ChordSymbol.tsx`:

```tsx
export type ChordState = 'upcoming' | 'current' | 'completed'
export type FlashColor = 'green' | 'red' | null

export interface ChordSymbolProps {
  symbol: string
  state: ChordState
  flash?: FlashColor
}

export function ChordSymbol({ symbol, state, flash = null }: ChordSymbolProps) {
  const classes = ['chord', `chord--${state}`]
  if (flash === 'green') classes.push('chord--flash-green')
  if (flash === 'red') classes.push('chord--flash-red')

  return <span className={classes.join(' ')}>{symbol}</span>
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npx vitest run src/ui/ChordSymbol.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Add the chord styles**

Append to `src/App.css`:

```css
.progression {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-family: 'Georgia', serif;
  font-size: 24px;
  line-height: 1.6;
  margin: 24px 0;
}

.chord {
  padding: 4px 8px;
  border-radius: 4px;
  border: 2px solid transparent;
  transition: opacity 0.2s ease;
}

.chord--upcoming {
  color: var(--text-color, #222);
}

.chord--current {
  border-color: currentColor;
  font-weight: 600;
}

.chord--completed {
  opacity: 0.4;
}

.chord--flash-green {
  animation: flash-green 500ms ease-out;
}

.chord--flash-red {
  animation: flash-red 500ms ease-out;
}

@keyframes flash-green {
  0%   { background-color: rgba(40, 200, 80, 0.7); }
  100% { background-color: transparent; }
}

@keyframes flash-red {
  0%   { background-color: rgba(220, 60, 60, 0.7); }
  100% { background-color: transparent; }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/ChordSymbol.tsx src/ui/ChordSymbol.test.tsx src/App.css
git commit -m "Add ChordSymbol component with state and flash classes"
```

---

## Task 8: ProgressionDisplay component

**Files:**
- Create: `src/ui/ProgressionDisplay.tsx`, `src/ui/ProgressionDisplay.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/ProgressionDisplay.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressionDisplay } from './ProgressionDisplay'
import type { Progression } from '../progression/types'

const prog: Progression = {
  name: 'Test',
  chords: [
    { symbol: 'Dm7',  pitchClasses: [2, 5, 9, 0],  bass: 2 },
    { symbol: 'G7',   pitchClasses: [7, 11, 2, 5], bass: 7 },
    { symbol: 'Cmaj7', pitchClasses: [0, 4, 7, 11], bass: 0 },
  ],
}

describe('<ProgressionDisplay>', () => {
  it('renders all chord symbols in order', () => {
    const { getAllByText } = render(
      <ProgressionDisplay progression={prog} cursor={0} flash={null} />,
    )
    expect(getAllByText(/Dm7|G7|Cmaj7/)).toHaveLength(3)
  })

  it('marks chords before cursor as completed and current/upcoming correctly', () => {
    const { getByText } = render(
      <ProgressionDisplay progression={prog} cursor={1} flash={null} />,
    )
    expect(getByText('Dm7')).toHaveClass('chord--completed')
    expect(getByText('G7')).toHaveClass('chord--current')
    expect(getByText('Cmaj7')).toHaveClass('chord--upcoming')
  })

  it('flashes green on the just-completed chord (cursor-1)', () => {
    // After advancing from chord 0 to chord 1, the green flash applies to chord 0
    const { getByText } = render(
      <ProgressionDisplay progression={prog} cursor={1} flash={{ color: 'green', onIndex: 0 }} />,
    )
    expect(getByText('Dm7')).toHaveClass('chord--flash-green')
  })

  it('flashes red on the current chord', () => {
    const { getByText } = render(
      <ProgressionDisplay progression={prog} cursor={1} flash={{ color: 'red', onIndex: 1 }} />,
    )
    expect(getByText('G7')).toHaveClass('chord--flash-red')
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run src/ui/ProgressionDisplay.test.tsx`
Expected: tests fail.

- [ ] **Step 3: Implement ProgressionDisplay**

Create `src/ui/ProgressionDisplay.tsx`:

```tsx
import type { Progression } from '../progression/types'
import { ChordSymbol, type ChordState, type FlashColor } from './ChordSymbol'

export interface FlashEvent {
  color: 'green' | 'red'
  onIndex: number
}

export interface ProgressionDisplayProps {
  progression: Progression
  cursor: number
  flash: FlashEvent | null
}

export function ProgressionDisplay({ progression, cursor, flash }: ProgressionDisplayProps) {
  return (
    <div className="progression">
      {progression.chords.map((chord, i) => {
        let state: ChordState = 'upcoming'
        if (i < cursor) state = 'completed'
        else if (i === cursor) state = 'current'

        const flashColor: FlashColor = flash && flash.onIndex === i ? flash.color : null

        return (
          <ChordSymbol
            key={i}
            symbol={chord.symbol}
            state={state}
            flash={flashColor}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npx vitest run src/ui/ProgressionDisplay.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ProgressionDisplay.tsx src/ui/ProgressionDisplay.test.tsx
git commit -m "Add ProgressionDisplay rendering chord rows with state + flash"
```

---

## Task 9: LoadPanel component

**Files:**
- Create: `src/ui/LoadPanel.tsx`, `src/ui/LoadPanel.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/LoadPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoadPanel } from './LoadPanel'

const validJson = JSON.stringify({
  name: 'Test',
  chords: [{ symbol: 'C', pitchClasses: [0, 4, 7], bass: 0 }],
})

describe('<LoadPanel>', () => {
  it('calls onLoad with parsed Progression on valid JSON', async () => {
    const user = userEvent.setup()
    const onLoad = vi.fn()
    render(<LoadPanel onLoad={onLoad} />)

    await user.click(screen.getByRole('textbox'))
    await user.paste(validJson)
    await user.click(screen.getByRole('button', { name: /load/i }))

    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(onLoad.mock.calls[0][0]).toMatchObject({
      name: 'Test',
      chords: [{ symbol: 'C' }],
    })
  })

  it('shows a parse error and does not call onLoad on malformed JSON', async () => {
    const user = userEvent.setup()
    const onLoad = vi.fn()
    render(<LoadPanel onLoad={onLoad} />)

    await user.click(screen.getByRole('textbox'))
    await user.paste('{ this is not json')
    await user.click(screen.getByRole('button', { name: /load/i }))

    expect(onLoad).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid json|parse|syntax/i)
  })

  it('shows a validation error on schema-invalid JSON', async () => {
    const user = userEvent.setup()
    const onLoad = vi.fn()
    render(<LoadPanel onLoad={onLoad} />)

    await user.click(screen.getByRole('textbox'))
    await user.paste('{"chords": []}')
    await user.click(screen.getByRole('button', { name: /load/i }))

    expect(onLoad).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/non-empty/i)
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run src/ui/LoadPanel.test.tsx`
Expected: tests fail.

- [ ] **Step 3: Implement LoadPanel**

Create `src/ui/LoadPanel.tsx`:

```tsx
import { useState } from 'react'
import type { Progression } from '../progression/types'
import { validateProgression } from '../progression/validate'

export interface LoadPanelProps {
  onLoad: (progression: Progression) => void
}

export function LoadPanel({ onLoad }: LoadPanelProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleLoad() {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      setError(`Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`)
      return
    }
    const result = validateProgression(parsed)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    onLoad(result.progression)
  }

  return (
    <section className="panel load-panel">
      <h2>Load progression</h2>
      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{"name":"...","chords":[{"symbol":"C","pitchClasses":[0,4,7],"bass":0}]}'
      />
      <div className="panel-controls">
        <button onClick={handleLoad}>Load</button>
      </div>
      {error && <div role="alert" className="error">{error}</div>}
    </section>
  )
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npx vitest run src/ui/LoadPanel.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Add minimal panel styles**

Append to `src/App.css`:

```css
.panel {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 12px 16px;
  margin: 16px 0;
}

.panel h2 {
  margin-top: 0;
  font-size: 16px;
}

.panel textarea {
  width: 100%;
  font-family: ui-monospace, monospace;
  font-size: 13px;
  box-sizing: border-box;
}

.panel-controls {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.error {
  margin-top: 8px;
  color: #c33;
  font-size: 13px;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/LoadPanel.tsx src/ui/LoadPanel.test.tsx src/App.css
git commit -m "Add LoadPanel with paste-and-validate flow"
```

---

## Task 10: LibraryPanel component (with save/load/list/delete)

**Files:**
- Create: `src/ui/LibraryPanel.tsx`, `src/ui/LibraryPanel.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/LibraryPanel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LibraryPanel } from './LibraryPanel'
import { saveProgression } from '../library/storage'
import type { Progression } from '../progression/types'

const example: Progression = {
  name: 'X',
  chords: [{ symbol: 'C', pitchClasses: [0, 4, 7], bass: 0 }],
}

beforeEach(() => {
  localStorage.clear()
})

describe('<LibraryPanel>', () => {
  it('renders saved progression names', () => {
    saveProgression('Alpha', example)
    saveProgression('Beta', example)
    render(<LibraryPanel current={null} onLoad={() => {}} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('calls onLoad with the saved progression when Load is clicked', async () => {
    const user = userEvent.setup()
    saveProgression('Alpha', example)
    const onLoad = vi.fn()
    render(<LibraryPanel current={null} onLoad={onLoad} />)
    await user.click(screen.getByRole('button', { name: /load alpha/i }))
    expect(onLoad).toHaveBeenCalledWith(example)
  })

  it('removes a progression when Delete is clicked', async () => {
    const user = userEvent.setup()
    saveProgression('Alpha', example)
    render(<LibraryPanel current={null} onLoad={() => {}} />)
    await user.click(screen.getByRole('button', { name: /delete alpha/i }))
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('saves the current progression with the entered name', async () => {
    const user = userEvent.setup()
    render(<LibraryPanel current={example} onLoad={() => {}} />)
    await user.type(screen.getByPlaceholderText(/save as/i), 'Newname')
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText('Newname')).toBeInTheDocument()
  })

  it('does not show the save row when no progression is loaded', () => {
    render(<LibraryPanel current={null} onLoad={() => {}} />)
    expect(screen.queryByPlaceholderText(/save as/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run src/ui/LibraryPanel.test.tsx`
Expected: tests fail.

- [ ] **Step 3: Implement LibraryPanel**

Create `src/ui/LibraryPanel.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react'
import type { Progression } from '../progression/types'
import {
  saveProgression,
  loadProgression,
  listProgressions,
  deleteProgression,
} from '../library/storage'

export interface LibraryPanelProps {
  current: Progression | null
  onLoad: (progression: Progression) => void
}

export function LibraryPanel({ current, onLoad }: LibraryPanelProps) {
  const [names, setNames] = useState<string[]>([])
  const [saveName, setSaveName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setNames(listProgressions())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (current?.name) setSaveName(current.name)
  }, [current])

  function handleLoad(name: string) {
    const p = loadProgression(name)
    if (p) onLoad(p)
  }

  function handleDelete(name: string) {
    if (!window.confirm(`Delete "${name}"?`)) return
    deleteProgression(name)
    refresh()
  }

  function handleSave() {
    if (!current) return
    const trimmed = saveName.trim()
    if (!trimmed) {
      setError('Name cannot be empty')
      return
    }
    if (names.includes(trimmed)) {
      if (!window.confirm(`Overwrite existing "${trimmed}"?`)) return
    }
    const result = saveProgression(trimmed, current)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    refresh()
  }

  return (
    <section className="panel library-panel">
      <h2>Library</h2>

      {current && (
        <div className="library-save-row">
          <input
            type="text"
            placeholder="Save as..."
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
          />
          <button onClick={handleSave}>Save</button>
        </div>
      )}

      {names.length === 0 ? (
        <p className="library-empty">No saved progressions yet.</p>
      ) : (
        <ul className="library-list">
          {names.map((name) => (
            <li key={name}>
              <span className="library-name">{name}</span>
              <button aria-label={`Load ${name}`} onClick={() => handleLoad(name)}>
                Load
              </button>
              <button aria-label={`Delete ${name}`} onClick={() => handleDelete(name)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <div role="alert" className="error">{error}</div>}
    </section>
  )
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npx vitest run src/ui/LibraryPanel.test.tsx`
Expected: all tests pass.

Note: The "removes a progression when Delete is clicked" test uses `window.confirm`, which jsdom returns `true` for by default. If you find it returns `false` in your environment, add `vi.spyOn(window, 'confirm').mockReturnValue(true)` in `beforeEach`.

- [ ] **Step 5: Add library styles**

Append to `src/App.css`:

```css
.library-list {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
}

.library-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.library-name {
  flex: 1;
  font-family: ui-monospace, monospace;
}

.library-save-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.library-save-row input {
  flex: 1;
  padding: 4px 6px;
}

.library-empty {
  color: #888;
  font-style: italic;
  margin: 8px 0 0;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/LibraryPanel.tsx src/ui/LibraryPanel.test.tsx src/App.css
git commit -m "Add LibraryPanel with save/load/list/delete"
```

---

## Task 11: Header and ControlsStrip components

**Files:**
- Create: `src/ui/Header.tsx`, `src/ui/ControlsStrip.tsx`

- [ ] **Step 1: Implement Header**

Create `src/ui/Header.tsx`:

```tsx
export interface HeaderProps {
  deviceNames: string[]
  selectedDeviceId: string | null
  onSelectDevice: (id: string) => void
  status: 'connected' | 'disconnected' | 'denied' | 'pending'
  selectedDeviceName: string | null
}

export function Header({
  deviceNames,
  selectedDeviceId,
  onSelectDevice,
  status,
  selectedDeviceName,
}: HeaderProps) {
  let statusText = ''
  if (status === 'pending') statusText = 'Requesting MIDI access...'
  else if (status === 'denied') statusText = 'MIDI permission denied — re-grant in browser settings'
  else if (status === 'disconnected' || !selectedDeviceName) statusText = 'No MIDI device'
  else statusText = `Connected: ${selectedDeviceName}`

  return (
    <header className="app-header">
      <h1>Piano Trainer</h1>
      <div className="midi-status">
        <span className={`status-dot status-${status}`} />
        <span>{statusText}</span>
        {deviceNames.length > 1 && (
          <select
            value={selectedDeviceId ?? ''}
            onChange={(e) => onSelectDevice(e.target.value)}
            aria-label="MIDI device"
          >
            {deviceNames.map((name, i) => (
              <option key={i} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Implement ControlsStrip**

Create `src/ui/ControlsStrip.tsx`:

```tsx
export interface ControlsStripProps {
  onRestart: () => void
  onReset: () => void
  canRestart: boolean
  canReset: boolean
}

export function ControlsStrip({ onRestart, onReset, canRestart, canReset }: ControlsStripProps) {
  return (
    <div className="controls-strip">
      <button onClick={onRestart} disabled={!canRestart}>
        Restart
      </button>
      <button onClick={onReset} disabled={!canReset}>
        Reset
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Add header + controls styles**

Append to `src/App.css`:

```css
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 12px;
}

.app-header h1 {
  margin: 0;
  font-size: 20px;
}

.midi-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #888;
  display: inline-block;
}

.status-connected { background: #2c2; }
.status-denied { background: #c33; }
.status-disconnected { background: #888; }
.status-pending { background: #fa0; }

.controls-strip {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Header.tsx src/ui/ControlsStrip.tsx src/App.css
git commit -m "Add Header (MIDI status + device picker) and ControlsStrip"
```

---

## Task 12: useMidiInput hook (Web MIDI integration)

**Files:**
- Create: `src/midi/useMidiInput.ts`

This task wraps the `webmidi` library in a React hook. There are no automated tests for this task — Web MIDI requires real hardware and a browser context. The pure logic that consumes `heldNotes` is tested elsewhere (`matchesChord`, `createSettleQueue`). Manual testing is covered by the README checklist in Task 14.

- [ ] **Step 1: Implement the hook**

Create `src/midi/useMidiInput.ts`:

```ts
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
}

export function useMidiInput(): UseMidiInputResult {
  const [status, setStatus] = useState<MidiStatus>('pending')
  const [deviceNames, setDeviceNames] = useState<string[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [heldNotes, setHeldNotes] = useState<ReadonlySet<number>>(new Set())
  const heldRef = useRef<Set<number>>(new Set())

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
  }
}
```

- [ ] **Step 2: Verify the file type-checks**

Run: `npx tsc --noEmit`
Expected: no errors. (If `webmidi`'s exports have changed in a newer version, fix the imports — this plan targets `webmidi` 3.x.)

- [ ] **Step 3: Commit**

```bash
git add src/midi/useMidiInput.ts
git commit -m "Add useMidiInput hook wrapping the webmidi library"
```

---

## Task 13: Wire it all together in App.tsx

**Files:**
- Modify: `src/App.tsx`

This task assembles the full app. It composes the hook, the settle queue, the chord-match function, and the UI components into a single state machine.

- [ ] **Step 1: Replace App.tsx with the full app shell**

Replace `src/App.tsx`:

```tsx
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
```

- [ ] **Step 2: Add the remaining styles**

Append to `src/App.css`:

```css
.empty-state {
  color: #666;
  font-style: italic;
  margin: 24px 0;
}

.done-indicator {
  font-size: 24px;
  font-weight: 600;
  color: #2a2;
  margin: 16px 0;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: no TS or build errors.

- [ ] **Step 4: Verify all tests still pass**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "Wire MIDI + settle + match + UI into a working app"
```

---

## Task 14: Write README with setup, Claude prompt, and manual test checklist

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:

````markdown
# Piano Trainer

A browser-based webapp for practicing piano chords with live MIDI input. Display a progression, play each chord on a connected MIDI controller, and the app advances when you play it correctly (with the right inversion).

See `docs/superpowers/specs/2026-05-09-piano-trainer-design.md` for the full design.

## Setup

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (typically http://localhost:5173). Connect a MIDI controller and grant the permission prompt the first time.

## Running tests

```bash
npm test          # one-shot
npm run test:watch
```

## How to use

1. Generate a progression by copying the prompt below into Claude. Fill in the parameters at the top, paste the prompt into a chat, and copy Claude's JSON output.
2. Paste the JSON into the **Load progression** textarea in the app and click **Load**.
3. Optionally save it to your library by entering a name and clicking **Save**.
4. The progression displays as a series of chord symbols. The current chord is boxed; play it on your MIDI controller. The app waits for your notes to settle (50 ms after the last keypress) before evaluating.
5. Correct → green flash, advances to the next chord. Wrong → red flash, you keep trying.
6. **Restart** returns to chord 1 of the same progression. **Reset** unloads the progression.

## Chord matching rules

- Every pitch class in the chord must be played, in any octave.
- Octave doublings are allowed.
- No foreign notes — playing any pitch class not in the chord fails the match.
- The lowest note must match the chord's specified bass (which encodes the inversion).

## Claude prompt for generating progressions

Copy this into Claude, fill in the parameters, and paste the JSON output into the app.

```
Generate a piano chord progression as JSON for my practice app.

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

Now generate the progression for the parameters above.
```

## Manual integration test checklist

After making any change to MIDI handling or the matching wiring, run through this with a real MIDI controller:

1. Open the app, grant MIDI permission. Header should say "Connected: <device name>".
2. Paste this minimal progression and click Load:
   ```json
   {
     "name": "Test",
     "chords": [
       { "symbol": "C",     "pitchClasses": [0, 4, 7],     "bass": 0 },
       { "symbol": "C/E",   "pitchClasses": [0, 4, 7],     "bass": 4 },
       { "symbol": "Cmaj7", "pitchClasses": [0, 4, 7, 11], "bass": 0 }
     ]
   }
   ```
3. Three chord symbols should appear, "C" boxed.
4. Play C-E-G (any octave) → green flash on "C", cursor advances to "C/E".
5. Play C-E-G in root position → red flash on "C/E" (wrong inversion).
6. Play E-G-C with E as the lowest note → green flash on "C/E", cursor advances.
7. Play C-E-G-B (any octave) → green flash on "Cmaj7", "Done!" appears.
8. Click Restart → cursor returns to "C", "Done!" disappears.
9. Disconnect the MIDI cable mid-practice. Header should switch to "No MIDI device". Reconnect — header returns to "Connected: ...". Cursor is preserved.
10. Click Reset → progression unloads, empty-state message appears.
11. Save the test progression to the library, refresh the page, confirm it reappears in the Library panel and loads correctly.

## Troubleshooting

- **No MIDI device detected:** Web MIDI requires Chrome / Edge / Opera (not Firefox or Safari as of writing). Check your browser, then check that the controller is recognized at the OS level.
- **Permission denied:** the browser remembers permission decisions per-origin. To re-grant, look in browser site settings for `localhost:5173` (or wherever the dev server is running).
- **Chord won't accept:** make sure you're not holding any extra notes (including from a sustain pedal). The app ignores sustain CC, but a stuck physical key will register.

## Project structure

```
src/
  chord/         pure chord-match logic
  progression/   JSON schema + validation
  settle/        50 ms debounce queue
  library/       localStorage CRUD
  midi/          Web MIDI hook (webmidi 3.x)
  ui/            React components
  App.tsx        top-level state machine + wiring
```
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Add README with setup, Claude prompt, and manual test checklist"
```

---

## Task 15: Final verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 2: Full test run**

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual integration test**

Run: `npm run dev`

Walk through the manual integration test checklist in `README.md` end-to-end with a real MIDI controller. Note any failures as new tasks before declaring done.

- [ ] **Step 5: Final commit (if anything was tweaked during manual testing)**

```bash
git status
# if there are changes:
git add -A
git commit -m "Manual test fixes"
```
