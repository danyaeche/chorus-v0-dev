# chorus-v0-dev

Dev repo for v0 of Chorus — a DFM-only, multi-provider workspace for hardware
teams coordinating manufacturing feedback with external reviewers/manufacturers.

The application lives in [`chorus/`](./chorus) — a Vite + React single-page app
using TanStack Router, TanStack React Query, TypeScript, Tailwind, shadcn/ui,
TanStack Table, React Hook Form, Zod, and a Supabase-ready domain layer.

```bash
cd chorus
npm install
npm run dev
```

See [`chorus/README.md`](./chorus/README.md) for the data model, workflow
invariants (package gate, per-DFM revision pointers, provider isolation, issue
state machine, sign-offs, DFM approval), repo layout, and deployment notes.

> Runs in **demo mode** out of the box (in-memory seed of the TM-4 Bike Program),
> or connect Supabase via `chorus/.env.example`.
