# Project Architecture Rules (Non-Obvious Only)

- Single-page app with no routing — all state managed in App.tsx component via useState hooks
- Audio engine: Tone.js PolySynth instantiated once in useEffect, stored in useRef<Tone.PolySynth | null> — never recreate synth instance
- SVG rendering is pure function of (scaleName, rootIndex, activeNoteIndex) — CircleOfNotes has no internal state
- No external state management (Redux/Zustand) — all props flow top-down from App.tsx
- Build pipeline: TypeScript `tsc -b` runs first (broad type check), then Vite bundles — both must succeed for build to pass
