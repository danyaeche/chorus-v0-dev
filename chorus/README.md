# Chorus v0

**DFM as a workflow — not a slide deck.** A productized, multi-provider
Design-for-Manufacturability workspace where a brand coordinates manufacturing
feedback with the external reviewers/manufacturers it sources from.

This is a Vite + React single-page application using TanStack Router for routing and TanStack React Query for client-side data refresh/invalidation. It runs with an in-memory demo repository by default.

## The model

```
Workspace/Org
└─ Project
   └─ Part ............ metadata · current released revision pointer · part state
      ├─ Package ...... process-type checklist · gate: Complete before reviewers can be invited
      ├─ Revisions .... Rev A · Rev B · Rev N (shared design — every provider reviews these)
      ├─ DFMs ......... one per provider · confidential · each with its OWN revision-under-review pointer
      │  └─ Issues .... typed · Open → Dispositioned → Implemented → Validated → Closed
      ├─ Issue Groups . brand-side rollups across providers (+ conflict flag) — never shown to reviewers
      ├─ Sign-offs .... joint agreements: Proposed → Aligned → Signed
      └─ DFM Approval . terminal gate — freeze the revision, cut steel
```

### Invariants the foundation enforces

1. **Package gate** — external reviewers cannot be invited until every required
   package item is complete (app check + a DB trigger backstop on `dfms` insert).
2. **Per-DFM revision pointer** — Provider 1 can review Rev C while Provider 2 is
   still on Rev B. Each DFM carries its own `current_revision_id`.
3. **Provider isolation** — a reviewer is bound to one `external_reviewer_id` and
   never sees another provider's DFM, files, recommendations, comments, or issues.
   Enforced centrally in `lib/permissions`.
4. **Issue Groups are brand-only** — cross-provider rollups (with a conflict flag)
   are never exposed to reviewers.
5. **Sign-offs are first-class** — joint agreements, not issues one side "accepts."
6. **DFM Approval gate** — all issues dispositioned + all required sign-offs signed
   + an approved revision frozen → cleared to cut steel.

## Stack

Vite · React · TanStack Router · TanStack React Query · TypeScript · Tailwind CSS · shadcn/ui · Lucide · TanStack Table · React Hook Form · Zod · Supabase-ready domain layer.

## Repo layout

```
src/main.tsx         TanStack Router route tree + React Query provider
src/root.tsx         app shell providers
src/routes/          route page components consumed by the SPA
  brand/             brand workspace screens
  supplier/$token/   external reviewer portal screens
lib/actions.ts       mutation helpers (create project/part, package toggle, disposition)
components/           UI: sidebar, tables, status badges, forms, package panel
lib/
  supabase/           browser / server / service-role / proxy clients
  auth/               brand session + magic-link token hashing
  permissions/        viewer context + every access decision (provider isolation)
  storage/            private-bucket signed URLs
  workflow/           issue state machine · package gate · approval gate · validation
  db/                 repository layer (+ in-memory demo store seeded with TM-4)
  validation.ts       Zod schemas shared by RHF + mutation helpers
db/migrations/        SQL: enums · tables · triggers · RLS · seed · storage bucket
types/                domain enums, models, view aggregates, labels
utils/                formatting helpers
```

## Running

```bash
npm install
npm run dev      # http://localhost:5173
```

### Demo vs. connected mode

With **no Supabase env vars set**, the app runs in **demo mode**: the repository
layer reads an in-memory seed (the TM-4 Bike Program — ALSO as the brand, Hsinchu
Precision + Shenzhen Optics reviewing in parallel). Every page, the workflow logic,
and the permission boundaries are fully exercised without provisioning anything.

Set the variables in `.env.example` to connect Supabase, then apply
`db/migrations/` in order (see `db/migrations/README.md`).

### Try the confidentiality boundary

- Brand view: `/dashboard`
- Reviewer portal (Hsinchu's scoped magic link): `/supplier/demo-hsinchu-token`
  — shows only Hsinchu's DFM on the one shared part, no issue groups, no other
  provider's data.

## What v0 deliberately does not build

No separate Express/FastAPI backend, no direct S3, no Kubernetes/microservices,
no native CAD viewer, no mold-flow/simulation, no quote/procurement automation,
no PLM/ERP integration. The complexity is the **data model, supplier
confidentiality, package gate, revision lineage, issue state machine, issue
grouping, sign-offs, and DFM approval** — not infrastructure. CAD viewing,
revision diffing, and watermarking are modeled as stubs / vNext hooks.

## Deploying on Render

Create a **Web Service**, root directory `chorus`, build `npm ci && npm run build`,
start `npm run start`. Add the Supabase env vars from `.env.example`.
