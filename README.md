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
