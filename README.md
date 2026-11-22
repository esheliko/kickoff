# kickoff

Templates for new projects. Tell a Claude session: **"create a kickoff project that does <purpose>"** and it creates the repo, backing services, secrets, first issues and first commit, then starts working.

## Templates
| Folder | What you get |
|---|---|
| `templates/web-app` | Next.js 16 + Supabase + Vercel, with Deploy Manager, smoke tests and the work model. |
| `templates/cross-platform-app` | One codebase for web (PWA), desktop and mobile: Rust engine compiled to WebAssembly and native, React UI, Tauri 2 shells, static Vercel deploy, tag-based native releases, and the work model. No backend. |

Every template also gets `kit/core`: standing rules, reply tags, hooks, `process/rules.json`, CI-status scripts and the process skill.

## Seeds
A seed is project-specific starter content layered on a template (docs, roadmap, extra modules). `seeds/overcut` turns `cross-platform-app` into Overcut, a free cross-platform video editor: product docs, roadmap, architecture, implementation plan, ADRs, engine crate skeleton and an empty responsive editor shell. Run the workflow with `template=cross-platform-app`, `seed=overcut`.

Add a template or seed by following CLAUDE.md. Local check: `node tools/instantiate-local.mjs <template> <out-dir> [--seed <name>]`.

## One-time setup: the secrets
Add these in **this repo: Settings > Secrets and variables > Actions > New repository secret**.

| Secret | How to get it |
|---|---|
| `KIT_GH_TOKEN` | github.com > your avatar > Settings > Developer settings > Personal access tokens > **Tokens (classic)** > Generate new token (classic). Name `kickoff`, expiration 1 year, tick **repo** and **workflow** (and **admin:org** only if you create projects in an organization). Copy the `ghp_...` value. |
| `VERCEL_TOKEN` | vercel.com > your avatar > **Account Settings > Tokens** > Create. Name `kickoff`, scope = your team, expiration 1 year. Copy it. |
| `VERCEL_TEAM_ID` | vercel.com > switch to your team > **Settings > General**: "Team ID" (`team_...`). |
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens > **Generate new token**, name `kickoff`. Copy it (shown once). |
| `SUPABASE_ORG_ID` | supabase.com/dashboard > your organization > **Settings > General**: "Organization slug" (a short id like `abcdefghijkl`). |
| `KIT_OWNER_EMAIL` | The email you want invited as the user of every new project. |

`cross-platform-app` needs only `KIT_GH_TOKEN`, `VERCEL_TOKEN` and `VERCEL_TEAM_ID` (no Supabase).

Free-plan note: Supabase free allows 2 active projects; Vercel Hobby limits deployments (the Deploy Manager already paces them).
