# {{NAME}}: developer notes

<!-- rules:begin (GENERATED from process/rules.json: edit there, then `npm run rules:build`) -->
<!-- rules:end -->

## What this project is
{{PURPOSE}}

Next.js 16 (App Router) + Supabase (email/password auth, RLS) + Vercel. See README.md for setup.

## Commands
- `npm run dev` / `npm run build` / `npm run typecheck` / `npm run lint` / `npm test`
- Build needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dummy values are fine for a compile check).

## Conventions
- All writes go through server actions via `requireUser()` (`src/lib/supabase/server.ts`); RLS on every table is the backstop.
- `src/proxy.ts` (Next 16 renamed middleware to proxy; Node runtime) gates every route except `/login`; API routes return 401 JSON when signed out. Auth via `getClaims()`, not `getUser()`.
- Schema changes go in a new numbered file under `supabase/migrations/` (keep them re-runnable and additive). It is applied automatically (the Deploy Manager runs `scripts/migrate.mjs` before each deploy); sessions may also run `node scripts/migrate.mjs` (`--status` / `--dry-run` to look); the owner never applies migrations. Details: DEPLOYING.md > Database migrations.
- Client/server boundary: a `"use client"` file exports components (and types) only. A server file must never call a function or read a value imported from one: it builds fine and crashes at request time. Shared helpers go in `src/lib`. `npm run lint` enforces this (`scripts/check-client-boundary.mjs`).
- Pure logic goes in `src/lib` with a unit test in `tests/unit/`; every new page gets a smoke step (`tests/smoke/smoke.spec.ts`) and a `loading.tsx` skeleton.
- Decorative sections must fail soft: catch and render nothing or a small note, never let them take the page down.
- Verification: `npm run lint && npm run typecheck && npm test`; CI `verify` also runs build + smoke.
- Debugging production: the error screen shows `Reference <digest>`; `node scripts/logs.mjs --digest <digest>` prints the real error (logs live ~1 h, look soon).
- Per-feature rules live in `docs/features/<feature>.md`; add a line here pointing at each ("Read `docs/features/x.md` before changing x").

<!-- kit:include token-cost -->

<!-- kit:include screenshots -->

## Smoke credentials
- Preferred: `SUPABASE_SERVICE_ROLE_KEY` (CI repo secret) makes every smoke run create and delete its own temporary account, so nothing else is needed and runs never collide (`DEPLOYING.md` > Temporary smoke accounts).
- Fallback when the key is absent (cloud sessions): `SMOKE_EMAIL` / `SMOKE_PASSWORD` for a dedicated test account. The session-start hook prints `SMOKE ENV:` with what is missing; trust that line, not memory. Never write the password into the repo, a commit, a log or a doc.

## Known gaps
- (none yet: list what is thin or missing so the next session does not assume it exists)

## Workflow
See the standing rule at the top: every change is a branch + PR, merged when its CI is green; merging to `main` queues it for the Deploy Manager, which deploys in batches. No direct pushes to `main`.
