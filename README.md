# kickoff

Templates for new projects. Tell a Claude session: **"create a kickoff project that does <purpose>"** and it creates the repo, backing services, secrets, first issues and first commit, then starts working.

## Templates
| Folder | What you get |
|---|---|
| `templates/web-app` | The Typecast work model (standing rules, reply tags, hooks, `process/rules.json`, CI `verify`, Deploy Manager, automation board, process skill) on a blank Next.js 16 + Supabase + Vercel app. |

Add another by creating `templates/<name>/` (see CLAUDE.md). The workflow's `template` input picks it.

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

Free-plan note: Supabase free allows 2 active projects; Vercel Hobby limits deployments (the Deploy Manager already paces them).
