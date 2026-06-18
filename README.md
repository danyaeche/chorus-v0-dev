# chorus-v0-dev

Dev repo for **v0 of Chorus AI** — _ask once, hear every voice._

Chorus sends a single prompt to several AI models at the same time and shows
their answers side by side so you can compare and keep the one that sings.

## Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- No backend required for v0 — answers are produced by a **mock provider** that
  simulates per-voice streaming.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # typecheck + production build
npm run preview  # serve the production build locally
npm run lint     # typecheck only (tsc --noEmit)
```

## The UI flow

1. **Pick your voices** — choose which models join the chorus (chip row above
   the composer).
2. **Ask once** — type a prompt and hit Enter. It fans out to every selected
   voice simultaneously.
3. **Compare** — each voice streams its answer into its own column, finishing at
   its own pace. Copy or regenerate any single answer.
4. **Continue** — ask follow-ups; each round is its own row of answers. Use
   _New chorus_ to start over.

## Project layout

```
src/
  types.ts          # domain types + the ChorusProvider contract
  voices.ts         # the roster of available models ("voices")
  mockProvider.ts   # simulated streaming provider (swap for a real backend)
  useChorus.ts      # state + fan-out orchestration hook
  App.tsx           # layout: header, conversation, composer dock
  components/        # VoicePicker, Composer, TurnView, AnswerCard, VoiceAvatar
```

### Wiring a real backend

Replace `mockProvider` with any object implementing the `ChorusProvider`
interface in `src/types.ts` (e.g. `fetch` + `ReadableStream`/SSE). The UI and
orchestration are provider-agnostic, so nothing else needs to change.
