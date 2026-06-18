# Chorus chat UI

_Ask once, hear every voice._

A v0 exploration of a **multi-model chat** experience: a single prompt is sent to
several AI models ("voices") at the same time and their answers stream in side by
side so you can compare them, synthesize a best-of answer, and keep the
conversation going.

> Note: this is a separate exploration from the DFM workspace in
> [`../chorus/`](../chorus). They share the repo and the "Chorus" name but are
> otherwise independent.

## Stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- No backend required — answers come from a **mock provider** that simulates
  per-voice streaming.

## Getting started

```bash
cd chat-ui
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
4. **Synthesize** — hit _✦ Synthesize best answer_ to have the **Conductor**
   read every voice's answer and distill one merged best-of response.
5. **Follow up** — ask again and the conversation **threads**: each voice carries
   its own history (the prompts and its own prior answers) into the next turn, so
   follow-ups have context. Use _New chorus_ to start over.

### Threading model

Each voice keeps its **own** thread — it sees the user prompts and its own prior
answers from the turns it took part in. A voice added partway through a
conversation starts fresh from the moment it joins. Synthesis is a per-turn
artifact and is not fed back into any voice's thread.

## Project layout

```
chat-ui/
  index.html
  src/
    types.ts          # domain types + the ChorusProvider contract
    voices.ts         # the roster of voices + the Conductor (synthesis)
    mockProvider.ts   # simulated streaming provider (swap for a real backend)
    useChorus.ts      # state, threading + fan-out + synthesis orchestration
    App.tsx           # layout: header, conversation, composer dock
    components/        # VoicePicker, Composer, TurnView, AnswerCard,
                       # SynthesisCard, VoiceAvatar
```

## Wiring a real backend

Replace `mockProvider` with any object implementing the `ChorusProvider`
interface in `src/types.ts`. It has two methods:

- `ask(voice, messages, onChunk, signal)` — `messages` is the voice's threaded
  history (oldest first, ending with the current user prompt), which maps
  directly onto a chat-completions request.
- `synthesize({ prompt, answers }, onChunk, signal)` — the Conductor step;
  `answers` is every voice's text for the turn.

The UI and orchestration are provider-agnostic, so nothing else needs to change.
