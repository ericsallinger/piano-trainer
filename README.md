TODO::
[] add 2 hand mode that requires both hands to play the chord correctly and full
[] add multiple prompts - formatting json from screenshot and from guitartabs text
[] looping mode
[] make each cord right-clickable to allow selecting duration of chord from 16th to whole note and reflect that selection in the display. allow for saving the tempo as well in the json

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
12. With Tempo ON and BPM = 60, load the 3-chord test progression. Play through it. After "Done!" appears, verify a result line shows `Expected 0:08 · Actual <your time> (delta)`. (8 s = (3 − 1) × 4 × 1.0 s.)
13. Click Restart, change BPM to 120, play through again. Verify the expected time updates to `0:04`.
14. Toggle Tempo OFF. Click Restart, play through. Verify only "Done!" appears — no result line.
15. Toggle Tempo ON, play the first chord correctly, then toggle Tempo OFF mid-progression. Finish playing. Verify no result line appears (since `endMs` was never captured).
16. Refresh the page. Verify the BPM value and Tempo toggle state are preserved from before the refresh.
17. With Tempo ON, clear the BPM input and type `0`, then `9999`. Verify the input clamps to 20 and 300 respectively and the app does not crash.

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
