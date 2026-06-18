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

## Also in this repo: multi-model chat UI exploration ([`chat-ui/`](./chat-ui))

> **Heads-up — two parallel "Chorus" explorations live here.** The DFM workspace
> above (in [`chorus/`](./chorus)) is one. The Vite/React app in
> [`chat-ui/`](./chat-ui) is a separate v0 exploration of a *multi-model chat*
> idea, added by the `refine-chorus-ui-flow` PR. They share the repo and the name
> but are otherwise independent; which direction to keep is a product decision for
> review.

**Concept:** _ask once, hear every voice._ A single prompt is sent to several AI
models at the same time; their answers stream in side by side so you can compare
them, synthesize a best-of answer, and keep the conversation going (threaded).

```bash
cd chat-ui
npm install
npm run dev      # http://localhost:5173
```

See [`chat-ui/README.md`](./chat-ui/README.md) for the full flow, the threading
model, the project layout, and how to wire a real backend via the
`ChorusProvider` contract.
