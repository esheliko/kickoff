---
name: new-project
description: Create a new project from a kickoff template (web-app: Next.js + Supabase + Vercel; cross-platform-app: Rust engine + WASM + Tauri + React; optional seed such as overcut) with the Typecast work model. Use when the owner says "create a kickoff project that does <purpose>" or asks for a new project/app from the kit.
---

# New project from the kit (zero manual steps)

1. Pick a display name and a lowercase-kebab slug from the purpose (ask only if the purpose gives nothing to name it by).
2. Attach the repo if it is not in this session: `mcp__claude-code-remote__add_repo` (`esheliko/kickoff`, access `push`). Pick the template folder under `templates/` that fits (ask only if two fit; default `web-app`), and a seed under `seeds/` if one exists for this project (e.g. `overcut` with `cross-platform-app`).
3. Start the workflow: `mcp__github__actions_run_trigger` on `esheliko/kickoff`, workflow `new-project.yml`, ref `main`, inputs `template`, optional `seed`, `name`, `slug`, `purpose` (and `visibility`/`region` only if the owner named them). Never put secrets in inputs.
4. Read the run with `mcp__github__actions_get` until it finishes (a few minutes; the Supabase project takes the longest). If it fails, read the job log (`get_job_logs`), fix the cause in the kit if it is a kit bug (normal branch + PR flow), otherwise tell the owner the one thing they must do (a missing kit secret). A half-created project (repo exists) needs its leftovers removed before a retry: say which.
5. Attach the new repo (`add_repo`, access `push`), look up your own session id (`get_session` with no `session_id`), and start the first work session on it: `mcp__claude-code-remote__create_session` with `source_url` of the new repo and this brief (fill `<PARENT>` with your session id):
   > Read CLAUDE.md and issue #3, then do it.
   > You were created by the kickoff session `<PARENT>`, which created this repo and owns its process, CI and kit. If you hit a problem you cannot fix inside this repo's product code (CI/workflow failures, hooks, process files, secrets or settings, anything that looks like a kit bug), open an issue AND `send_message` to `<PARENT>` with the issue link, what you tried and what you need. Do not wait silently and do not work around it.
   The first task is issue #3.
6. After the run, check the project, do not trust the green run: the new repo has a commit on `main` and its files, and its first CI run on `main` created a `verify` job (a workflow that is not valid YAML fails instantly with zero jobs). Fix kit bugs in the kit; see "Problems in projects the kit created" below.
7. Reply to the owner: link to the repo, the first session, and that the Supabase invite email is in their inbox (set a password there). That is the only thing they have to do.

## Problems in projects the kit created (standing rule)

The kickoff session that created a project owns it until the owner says otherwise. When a child session reports a problem (a `send_message` to you, an issue it opened, or a blocked child: `list_sessions` with `children: true`, `get_session`, `list_events`):
1. Read the child's issue and evidence. Do not wait to be told by the owner; check the children after creating a project and whenever the owner asks about it.
2. Fix the cause in the project (a branch + PR on the new repo, with `verify` green) and unblock the child with `send_message` (what changed, what to do next).
3. Find out why the kit produced the problem and fix it in the kit (branch + PR here, with a test that fails without the fix), so the next project does not have it. Say so to the owner: what broke, what you fixed in the project, what you fixed in the kit.
