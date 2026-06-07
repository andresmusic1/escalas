# Project Documentation Rules (Non-Obvious Only)

- [`src/lib/musicLogic.ts`](src/lib/musicLogic.ts) is the single source of truth for all music theory — 898 lines covering 40+ scales, formulas, and enharmonic logic
- SCALE_FORMULA indices are semitone offsets from root (0 = tonic); target index calculated as `(rootIndex + interval) % 12`
- CHROMATIC_SCALE uses flat convention (Db, Eb, Gb, Ab, Bb) — enharmonic conversion handled by smart system in same file
- SCALE_CATEGORIES defines UI tab groups; SCALE_CATEGORY_ORDER controls render order
- All comments are in Spanish — do not translate or modify existing comment text
