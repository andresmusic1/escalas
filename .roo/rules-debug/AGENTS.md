# Project Debug Rules (Non-Obvious Only)

- No test framework configured — manual testing via `npm run dev` and browser preview only
- Tone.js audio context requires user gesture to start; if notes don't play, verify Play button triggers audio initialization
- SVG rendering issues: check that `rootIndex` is correctly passed from App.tsx to CircleOfNotes — wrong rotation indicates rootIndex mismatch
- TypeScript build fails silently on type errors during `npm run dev` — watch terminal for `tsc -b` errors before Vite errors
- CSS animations use Tailwind v4 syntax (`@import "tailwindcss"`) — do not use v3 directives like `@tailwind base`
