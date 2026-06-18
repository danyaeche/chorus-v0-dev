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
