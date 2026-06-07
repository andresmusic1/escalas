# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview
React 19 + TypeScript + Vite 7 SPA — Interactive musical scale circle visualizer using SVG and Tone.js audio.
**Current version: v16.1** (Piano Sampler with real samples C4-C5, adjusted params for 48kHz/~2s/~60kbps)

## Build/Lint/Test Commands
- `npm run dev` — Start Vite dev server (localhost:5173)
- `npm run build` — Run `tsc -b && vite build` (TypeScript broad build then Vite bundling)
- `npm run preview` — Preview production build
- `npx tsx src/test-enharmony.ts` — Run enharmony validation (166 tests)
- `npx tsc --noEmit` — Verify TypeScript compilation
- No test framework configured; no linting configured.

## Code Style & Conventions
- **Strict TypeScript**: `"strict": true`, `"noUnusedLocals": false`, `"noUnusedParameters": false` in [`tsconfig.json`](tsconfig.json)
- **Module system**: ES modules (`"type": "module"` in package.json), `moduleResolution: "bundler"`
- **Imports**: Named imports from `./lib/musicLogic` for all music constants/functions; Tone.js imported as `import * as Tone from 'tone'`
- **Component naming**: PascalCase components (e.g., [`CircleOfNotes.tsx`](src/components/CircleOfNotes.tsx), [`App.tsx`](src/App.tsx))
- **File structure**: `src/lib/` for pure logic, `src/components/` for React components, `src/*.tsx` for top-level components
- **Comments**: Spanish comments throughout; block-style section headers using `// ====` patterns
- **Tailwind CSS v4**: Uses `@import "tailwindcss"` (v4 syntax) in [`src/index.css`](src/index.css); custom CSS variables `--color-background`, `--color-gold`, `--color-red`
- ⚠️ **Tailwind v4 does NOT generate grid/gap classes** — use inline styles: `style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}`

## Architecture Notes
- Music theory logic centralized in [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts) — exports SCALE_FORMULAS (39+ scales), CHROMATIC_SCALE, getScaleIndices(), resolveEnharmonicName(), getIntervalName(), etc.
- Audio via Tone.js: `pianoSampler` (Tone.Sampler with real samples C4-C5), `proPiano` (PolySynth triangle + effects chain), `campana` (PolySynth sine + cathedral reverb) — configured in [`src/lib/audioEngine.ts`](src/lib/audioEngine.ts)
- SVG rendering: CircleOfNotes component handles all visual math (angle rotation, polygon generation) using trigonometric positioning
- Root note always at -90° (12 o'clock): `startAngle + ((noteIndex - rootIndex) * angleStep)` where `angleStep = 2π/12`

## Musical Protocol — Heptatonic Rule of Unique Letters
**Implemented in v8.8:** For 7-note scales with natural roots, enforces the "Rule of Gold": exactly seven letters A-G used once each. Generates heptatonic skeleton from root, assigns alterations (#/b) based on absolute intervals to eliminate enharmonic errors. Altered roots maintain double alterations for complex cases.

## Current Version Details (v16.1)
- **AudioEngine:** 3 instruments — `pianoSampler` (default), `proPiano`, `campana`
- **Samples:** `/samples/pad piano/` — 13 OGG notes (C4-C5), 48kHz/mono/Vorbis, ~2s duration, ~60kbps
- **Adjusted params (v16.1):** release: 1.5s, filter: 4500Hz, volume: -3dB, reverb decay: 2.0s, reverb wet: 0.35
- **Music:** ~48 scales with perfect enharmony — heptatonic protocol (algorithmic), OCTATONIC_MAPPINGS (pivots), TRITONE/PROMETHEUS/AUGMENTED_SPELLINGS (dictionaries)
- **UI (v11.0+):** Floating controls top-center over SVG. Clean left panel with Categories → Scales → Root → Audio → Tempo+Play → Current Scale

## ⚠️ Known Issues / Remaining Debt
- **UI sync uses setTimeout (NOT Tone.Draw):** Visual highlight in [`App.tsx:184-191`](src/App.tsx:184) uses `setTimeout` — future migration target: `Tone.Draw`
- **No automated test framework:** Regression detection relies on manual `npx tsx src/test-enharmony.ts` (166 tests)
- **SVG styling:** Do not use CSS rotation on the circle container; use coordinate math in `CircleOfNotes.tsx`.
- **Immutable chromatic base:** `CHROMATIC_SCALE` must remain unchanged; only visual labels may swap enharmonic variants.
- **Bug Documentado (no fixeo):** ROOT_NOTES_SOSTENIDOS index bug en [`App.tsx:394`](src/App.tsx:394) — botón G# usa `[1]` en lugar de `[2]` para rootIndex 8

## ✅ Resolved Issues
- **Altered con raíces # (v9.2):** ✅ COMPLETADO — `getDoublyAlteredName()` ahora recibe y usa `selectedRootName`.
- **Hirajoshi Enarmonía (v9.3):** ✅ COMPLETADA — mapeo diatónico `{0:0, 2:1, 3:2, 7:4, 8:5}`. 166/166 tests pasando.
- **Piano Sampler (v16.0):** ✅ COMPLETADO — Tone.Sampler con samples reales C4-C5
- **Parámetros ajustados (v16.1):** ✅ COMPLETADO — release, filter, volume, reverb adaptados a características reales de samples

## Key Files Reference
| File | Purpose | Lines |
|------|---------|-------|
| [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts) | Music theory source of truth (39+ scales, enharmony v9.3, intervals, heptatonic protocol, SCALE_EXTENDED_INFO) | ~1816 |
| [`src/lib/audioEngine.ts`](src/lib/audioEngine.ts) | AudioEngine singleton: Tone.Sampler + PolySynth + Compressor + FeedbackDelay + Filter + Reverb (3 instruments) — v16.1 params | ~500 |
| [`src/components/CircleOfNotes.tsx`](src/components/CircleOfNotes.tsx) | SVG interactive circle with trigonometric positioning, neon glow filters, chord gradient | ~734 |
| [`src/App.tsx`](src/App.tsx) | Main component + audio engine + UI + chord mode state management | ~659 |
| [`src/test-enharmony.ts`](src/test-enharmony.ts) | Enharmony validation script (166 tests: 12 roots × key scales) | ~804 |
| [`src/index.css`](src/index.css) | Tailwind v4 + custom properties (`--color-background`, `--color-gold`, `--color-red`) + CSS animations | - |
