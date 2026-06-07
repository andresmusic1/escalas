# Project Coding Rules (Non-Obvious Only)

- All music theory constants/functions must be imported from `./lib/musicLogic` — never duplicate scale formulas or chromatic logic
- Tone.js audio setup is in [`App.tsx`](src/App.tsx) useEffect — always use `Tone.PolySynth(Tone.Synth, {...})` with triangle oscillator + Reverb pattern; connect synth to reverb via `synth.connect(reverb)`
- SVG visual math (angle rotation, polygon generation) lives in [`CircleOfNotes.tsx`](src/components/CircleOfNotes.tsx) — use `getRotatedNotePosition(noteIndex, rootIndex, CENTER, CENTER, radius)` for consistent positioning
- Root note always positioned at -90° (12 o'clock): angle formula is `startAngle + ((noteIndex - rootIndex) * angleStep)` where `angleStep = 2π/12`
- CSS custom properties in [`src/index.css`](src/index.css): `--color-background: #12161c`, `--color-gold: #dfc47f`, `--color-red: #e53e3e` — use these for all theme colors
- Animation class `.note-active` triggers pulse-red animation (0.3s ease-out forwards) for active note highlighting
- ⚠️ **UI sync uses setTimeout (NOT Tone.Draw):** Visual highlight in [`App.tsx:184-191`](src/App.tsx:184) uses `setTimeout` — this is a known technical debt. Future migration target: `Tone.Draw` for precision on slow hardware
- ⚠️ **ROOT_NOTES_SOSTENIDOS index bug (v8.2):** G# button at [`App.tsx:394`](src/App.tsx:394) uses `ROOT_NOTES_SOSTENIDOS[1]` — should be `[2]` for rootIndex 8. Documented but not yet fixed
- Tailwind CSS v4 does NOT generate grid/gap classes — use inline styles: `style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}`
- Footer text is author credits (v8.2): "Creado por Andrés Eduardo Garzón Polanía" + contact info — do NOT revert to generic "Círculo Cromático Interactivo" text
