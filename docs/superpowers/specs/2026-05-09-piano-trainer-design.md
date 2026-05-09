# Piano Trainer — Design

A browser-based webapp for practicing piano chords with live MIDI input. Display a chord progression, play each chord on your controller, get real-time green/red feedback, advance only when correct.

## Goals

- Step-by-step chord practice with real-time feedback driven by MIDI input.
- First-class support for **inversions**, since learning inversions is a primary use case.
- Self-contained: pure browser app, no backend, no API keys.
- Generate progressions externally with a Claude prompt that emits a simple, parseable JSON schema.

## Non-goals (v1)

- MIDI file ingestion. JSON-only input.
- End-of-piece review screens or attempt counters.
- Multi-hand voicings (e.g. separate LH/RH parts). Future extension.
- Audio playback / metronome / tempo features.
- Cloud sync of saved progressions.

## Architecture

Single-page **React + TypeScript** app, built with **Vite**, no backend. All runtime state lives in the browser.

- **Web MIDI API** (via the [`webmidi`](https://github.com/djipco/webmidi) library) reads MIDI input.
- **React state** holds the loaded progression, current chord index, and currently-held notes.
- **Browser localStorage** stores the named library of saved progressions.

### Module boundaries

| Module          | Responsibility                                                                                         |
|-----------------|--------------------------------------------------------------------------------------------------------|
| `midi/`         | Web MIDI device discovery, connection, note-on/off event stream → `Set<midiNumber>` of held notes.     |
| `chord/`        | Pure matching logic. Settle-window evaluation, pitch-class set comparison, bass/inversion check.       |
| `progression/`  | JSON schema definition + parsing/validation of pasted progressions.                                    |
| `library/`      | localStorage CRUD: save/load/list/delete progressions by name.                                         |
| `ui/`           | React components: `<ProgressionDisplay>`, `<ChordSymbol>`, `<DeviceSelector>`, `<LoadPanel>`, `<LibraryPanel>`, `<Header>`, `<ControlsStrip>`. |

Each module has a small public API. The chord-matching logic is fully pure — set in, boolean out — so it can be tested without MIDI hardware.

## Chord detection algorithm

The JSON is the source of truth. Each chord carries its own required pitch classes and bass note explicitly, so the app does not maintain an internal chord database or symbol parser. Claude does the music-theory work at generation time.

### JSON per-chord fields

- `symbol` — display string only, e.g. `"Cmaj7/E"`. Cosmetic; not parsed.
- `pitchClasses` — array of unique integers in `[0, 11]` representing the chord's pitch classes (C=0, C#=1, …, B=11).
- `bass` — single integer in `[0, 11]` for the required bass pitch class. Must be a member of `pitchClasses`.

### Matching procedure

Triggered every time the held-notes set changes, debounced by a 50 ms settle window (no evaluation runs until the held set has been stable for 50 ms).

1. Take the current `Set<number>` of held MIDI note numbers.
2. If the set is empty → no-op.
3. Find the lowest MIDI number → compute `userBass = lowest % 12`.
4. Compute `userPCs = new Set(allHeld.map(n => n % 12))`.
5. **Match iff** `userPCs` equals `target.pitchClasses` as a set **and** `userBass === target.bass`.
6. On match: green flash, advance cursor.
7. On no match (with at least one note held): red flash, stay on current chord.

### Why this works

- **Octave doublings pass:** collapsing to pitch classes naturally allows the same pitch class at multiple octaves.
- **Foreign notes fail:** any extra pitch class enlarges `userPCs` and breaks set equality.
- **Wrong inversion fails:** `userBass` mismatch on otherwise-correct notes (e.g. playing `Cmaj7` root position when `Cmaj7/E` was required).
- **Exotic chords work without code changes:** the algorithm never needs to know what `Cmaj7♭5` means — only the pitch-class numbers.

### Trust boundary

If a generated JSON file has `symbol` and `pitchClasses` that don't agree (e.g. `"Cmaj7"` paired with `[0,4,7,10]`), the app trusts the numbers and the displayed symbol will be misleading. The Claude prompt template (below) is written carefully to prevent this. A future enhancement could parse `symbol` to sanity-check, but is out of scope for v1.

## JSON schema

```json
{
  "name": "Jazz ii-V-I in C",
  "chords": [
    { "symbol": "Dm7",   "pitchClasses": [2, 5, 9, 0],  "bass": 2 },
    { "symbol": "G7/B",  "pitchClasses": [7, 11, 2, 5], "bass": 11 },
    { "symbol": "Cmaj7", "pitchClasses": [0, 4, 7, 11], "bass": 0 }
  ]
}
```

### Validation rules

Enforced on paste/load. On any failure, show a specific inline error in the Load panel and do **not** replace the currently loaded progression.

- `name`: optional string. Used as the default name in the "Save to library" input.
- `chords`: non-empty array.
- For each chord:
  - `symbol`: non-empty string.
  - `pitchClasses`: array of 1–12 unique integers in `[0, 11]`.
  - `bass`: integer in `[0, 11]`. Must be a member of `pitchClasses`.

## Claude prompt (lives in README)

The user fills in parameters and pastes the prompt into Claude, then pastes Claude's JSON output into the app. Template:

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

The user is free to edit this template directly in the README to refine style or add new parameter dimensions over time.

## UI layout & data flow

### Page structure (top to bottom)

1. **Header bar** — app title, MIDI device status (`"Connected: Yamaha P-125"` / `"No MIDI device"`), device picker dropdown when multiple are connected.
2. **Load panel** (collapsible) — textarea for pasting JSON, "Load" button, validation error display, "Save to library as…" input + button (visible after a valid load).
3. **Library panel** (collapsible) — list of saved progressions by name, each row with "Load" and "Delete" buttons.
4. **Progression display** — wrapping rows of chord symbols. The current chord has a boxed highlight; completed chords are dimmed; upcoming chords are normal weight. Brief flash overlays (green on correct match, red on wrong attempt).
5. **Controls strip** — `Restart` (back to chord 0), `Reset` (unload current progression).

### State machine

```
idle → active → complete
```

- `idle`: no progression loaded. Load panel prominent.
- `active`: progression loaded, cursor pointing at the current chord, evaluating MIDI input.
- `complete`: cursor advanced past last chord. Show small "Done!" indicator with `Restart` button.

Transitions: `idle → active` on successful Load. `active → complete` when the cursor advances past the final chord. `complete → active` on `Restart`. Any state → `idle` on `Reset`.

### Per-frame data flow

```
MIDI note-on/off → heldNotes: Set<midiNumber>
  → debounce 50ms after last change
  → evaluate(heldNotes, target)
    → match? → green flash on the just-completed chord, then advance cursor
    → no match (≥1 note held)? → red flash on the current chord, stay on cursor
    → empty set? → no-op
```

The green flash plays on the chord that was just satisfied (the chord at the cursor position before advancing) so the user sees confirmation on the chord they just played, not the next one.

The 50 ms settle window is a single `setTimeout` cleared and reset on every note change. Evaluation runs on the trailing edge only. This forgives transient finger-landing errors (the user has 50 ms to correct an extra note before evaluation fires).

## Edge cases & error handling

### MIDI input

- **No device connected:** "No MIDI device detected — connect a controller and click Refresh" in the header. Loading progressions is still allowed; the practice display shows a "waiting for MIDI" state.
- **Permissions denied:** banner explaining how to re-grant in browser settings.
- **Multiple devices:** picker in the header; default to the first device on connect.
- **Device disconnected mid-practice:** banner appears, current state preserved, reconnect resumes from the same chord.
- **Sustain pedal (CC 64) and other Control Change messages:** ignore entirely. Only `note-on` with velocity > 0 and `note-off` (or `note-on` with velocity 0, which some controllers send instead of `note-off`) affect `heldNotes`.

### Loading / JSON

- **Malformed JSON:** parse error shown inline; current progression unchanged.
- **Schema-invalid JSON** (e.g. `bass` not in `pitchClasses`, empty `chords`, pitch class out of range): specific validation error inline; current progression unchanged.
- **Saving to library with a duplicate name:** confirm-overwrite dialog.
- **localStorage quota exceeded:** show error, suggest deleting old entries.

### Practice flow

- **Holding notes from the previous chord while attempting the next:** naturally fails the next chord's match (extra notes inflate `userPCs`). User releases and re-plays. Intentional — encourages clean playing.
- **All keys released after a wrong attempt:** no-op. The red flash from the failed attempt stays until the next settle event.
- **Page refresh:** clears in-memory state including cursor position. Library persists. Acceptable for v1.

## Testing strategy

### Unit tests (Vitest)

- `chord/match.ts`: exact match, octave-doubled match, foreign note (fail), missing note (fail), wrong bass with right pitch classes (fail), root position vs. inversion of same chord, large doublings, single-note "chord" edge case.
- `progression/validate.ts`: minimal valid, missing fields, `bass` not in `pitchClasses`, pitch class out of range, empty chord array, duplicate pitch classes.
- `library/storage.ts`: save / load / list / delete / overwrite, quota-exceeded handling.

### Component tests (React Testing Library + Vitest)

- `<ProgressionDisplay>`: given a progression and cursor index, renders correct highlight states; given a "match" event, advances cursor and shows green flash; given a "miss" event, shows red flash without advancing.
- `<LoadPanel>`: paste valid JSON → calls `onLoad`; paste invalid JSON → shows error, no `onLoad`.

### Manual integration test (documented checklist in README)

- Connect real MIDI controller; load the example progression; play through it; confirm green/red feedback; confirm cursor advances; confirm wrap-around to the next row.
- Disconnect device mid-progression, reconnect, confirm resume from the same chord.

No e2e tests for v1 — a personal practice tool with a small surface doesn't justify Playwright setup; the manual checklist suffices to catch regressions.

## Future enhancements (out of scope for v1)

- Two-hand voicings (separate LH bass + RH chord, both required).
- Per-chord attempt-count tracking and end-of-piece review.
- MIDI file ingestion as a second input path.
- Tempo / metronome modes.
- Symbol-vs-pitchClasses sanity checker on JSON load.
