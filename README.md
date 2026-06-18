# chorus-v0-dev

Dev repo for v0 of Chorus — a DFM-only, multi-provider workspace for hardware
teams coordinating manufacturing feedback with external reviewers/manufacturers.

The application lives in [`chorus/`](./chorus) — a single full-stack Next.js
(App Router) app: TypeScript · Tailwind · shadcn/ui · TanStack Table · React Hook
Form · Zod · Supabase (Postgres / Auth / Storage).

```bash
cd chorus
pnpm install
pnpm dev
```

See [`chorus/README.md`](./chorus/README.md) for the data model, the workflow
invariants (package gate, per-DFM revision pointers, provider isolation, issue
state machine, sign-offs, DFM approval), the repo layout, and deployment notes.

> Runs in **demo mode** out of the box (in-memory seed of the TM-4 Bike Program),
> or connect Supabase via `chorus/.env.example`.

---

## Also in this repo: multi-model chat UI exploration (root)

> **Heads-up — two parallel "Chorus" explorations live here.** The DFM workspace
> above (in [`chorus/`](./chorus)) is one. The Vite/React app at the repo root
> (below) is a separate v0 exploration of a *multi-model chat* idea, added by the
> `refine-chorus-ui-flow` PR. They share the repo and the name but are otherwise
> independent; which direction to keep is a product decision for review.

**Concept:** _ask once, hear every voice._ A single prompt is sent to several AI
models at the same time and their answers stream in side by side so you can
compare them, synthesize a best-of answer, and keep the conversation going.

### Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- No backend required — answers come from a **mock provider** that simulates
  per-voice streaming.

### Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production build),
`npm run preview`, `npm run lint` (typecheck only).

### The UI flow

1. **Pick your voices** — choose which models join the chorus.
2. **Ask once** — the prompt fans out to every selected voice simultaneously.
3. **Compare** — each voice streams into its own column; copy or regenerate any
   single answer.
4. **Synthesize** — the **Conductor** distills every voice's answer into one
   merged best-of response.
5. **Follow up** — the conversation **threads**: each voice carries its own
   history into the next turn.

### Layout

```
src/
  types.ts          # domain types + the ChorusProvider contract
  voices.ts         # the roster of voices + the Conductor (synthesis)
  mockProvider.ts   # simulated streaming provider (swap for a real backend)
  useChorus.ts      # state, threading + fan-out + synthesis orchestration
  App.tsx           # layout: header, conversation, composer dock
  components/        # VoicePicker, Composer, TurnView, AnswerCard,
                     # SynthesisCard, VoiceAvatar
```

### Wiring a real backend

Replace `mockProvider` with any object implementing the `ChorusProvider`
interface in `src/types.ts`:

- `ask(voice, messages, onChunk, signal)` — `messages` is the voice's threaded
  history (oldest first, ending with the current user prompt), which maps
  directly onto a chat-completions request.
- `synthesize({ prompt, answers }, onChunk, signal)` — the Conductor step;
  `answers` is every voice's text for the turn.

The UI and orchestration are provider-agnostic, so nothing else needs to change.
