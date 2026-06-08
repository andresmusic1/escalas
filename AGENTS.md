# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview
React 19 + TypeScript + Vite 7 SPA — Interactive musical scale circle visualizer using SVG and Tone.js audio.
**Current version: v22.0** (Modo Quiz con preguntas visuales/auditivas + Exportar Audio WAV)

## Build/Lint/Test Commands
- `npm run dev` — Start Vite dev server (localhost:5173)
- `npm run build` — Run `tsc -b && vite build` (TypeScript broad build then Vite bundling)
- `npm run preview` — Preview production build
- `npm run dev` — Inicia el servidor de desarrollo en localhost:5173
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

## Current Version Details (v22.0)
- **AudioEngine v17.1:** 2 instruments Synth — `proPiano` (default), `campana` (eliminado Tone.Sampler)
- **Exportar Audio v17.0:** Módulo [`src/lib/audioExport.ts`](src/lib/audioExport.ts) con Tone.Offline para exportar WAV
  - Funciones: `exportScale()`, `exportChord()`, `audioBufferToWav()`
  - Formato: WAV PCM 16-bit, 48kHz sample rate
  - Botón "Exportar WAV" en UI debajo de Play/Stop (separado v21.7)
- **Modo Quiz v22.0:** Toggle 3 modos — Escala/Acorde/Quiz
  - Preguntas visuales: círculo cromático muestra escala/acorde, 4 opciones
  - Preguntas auditivas: solo audio, sin visualización
  - Patrón alternado fijo: visual → auditiva → visual...
  - Puntuación: 10 pts máximo, penalizaciones por ayudas (-2 a -4)
  - Pantalla inicial con nombre + cantidad (5/10/20) + categoría
- **Music:** ~48 scales with perfect enharmony — heptatonic protocol (algorithmic), OCTATONIC_MAPPINGS (pivots), TRITONE/PROMETHEUS/AUGMENTED_SPELLINGS (dictionaries)
- **UI (v22.0):** Toggle buttons debajo del header (🎹 Escala / 🎵 Acorde / 🧠 Quiz). Modo normal: left panel with Categories → Scales → Root → Audio → Tempo+Play → Exportar WAV

## ⚠️ Known Issues / Remaining Debt
- **No automated test framework:** Regression detection relies on manual `npx tsx src/test-enharmony.ts` (166 tests)
- **SVG styling:** Do not use CSS rotation on the circle container; use coordinate math in `CircleOfNotes.tsx`.
- **Immutable chromatic base:** `CHROMATIC_SCALE` must remain unchanged; only visual labels may swap enharmonic variants.

## ✅ Resolved Issues (Historical)
- **Altered con raíces # (v9.2):** ✅ COMPLETADO — `getDoublyAlteredName()` ahora recibe y usa `selectedRootName`.
- **Hirajoshi Enarmonía (v9.3):** ✅ COMPLETADA — mapeo diatónico `{0:0, 2:1, 3:2, 7:4, 8:5}`. 166/166 tests pasando.
- **Exportar Audio a WAV (v17.0+v20.1):** ✅ COMPLETADO — Web Audio API nativa (OfflineAudioContext), cuatríadas verificadas correctas
- **Modo Quiz v22.0:** ✅ COMPLETADO — Toggle 3 modos, preguntas visuales/auditivas alternadas, scoring con ayudas, pantalla inicial/final

## Key Files Reference
| File | Purpose | Lines |
|------|---------|-------|
| [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts) | Music theory source of truth (39+ scales, enharmony v9.3, intervals, heptatonic protocol, SCALE_EXTENDED_INFO) | ~1816 |
| [`src/lib/audioEngine.ts`](src/lib/audioEngine.ts) | AudioEngine singleton: PolySynth + Compressor + FeedbackDelay + Filter + Reverb (2 instruments: proPiano, campana) — v17.1 solo Synth | ~361 |
| [`src/lib/audioExport.ts`](src/lib/audioExport.ts) | Exportar audio a WAV con Tone.Offline: exportScale(), exportChord(), audioBufferToWav() | ~200 |
| [`src/lib/quizLogic.ts`](src/lib/quizLogic.ts) | Quiz lógica principal: generación preguntas, scoring, tipos (QuizState, QuestionType, generateQuizSession, answerQuestion) | ~570 |
| [`src/lib/quizAudio.ts`](src/lib/quizAudio.ts) | Reproducción audio quiz: playScaleForQuiz(), playChordForQuiz(), stopQuizAudio() con Tone.PolySynth directo | ~180 |
| [`src/components/CircleOfNotes.tsx`](src/components/CircleOfNotes.tsx) | SVG interactive circle with trigonometric positioning, neon glow filters, chord gradient | ~734 |
| [`src/components/QuizPanel.tsx`](src/components/QuizPanel.tsx) | Panel UI principal del Quiz: pantalla inicial, preguntas, opciones, ayudas, feedback | ~660 |
| [`src/components/QuizResult.tsx`](src/components/QuizResult.tsx) | Componente de resultados finales con puntuación y desglose expandible | ~200 |
| [`src/App.tsx`](src/App.tsx) | Main component + audio engine + UI + chord mode state management + exportar audio + appMode toggle (quiz v22.0) | ~1210 |
| [`src/test-enharmony.ts`](src/test-enharmony.ts) | Enharmony validation script (166 tests: 12 roots × key scales) | ~804 |
| [`src/index.css`](src/index.css) | Tailwind v4 + custom properties (`--color-background`, `--color-gold`, `--color-red`) + CSS animations | - |
