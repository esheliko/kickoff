# kickoff: project templates

A GitHub repo holding templates for new projects. Layout: `templates/<name>/` (each is a complete project skeleton with `{{PLACEHOLDERS}}` and its own `scripts/bootstrap.mjs`), `.github/workflows/new-project.yml` (creates a project from a template, no manual steps), `.claude/skills/new-project/` (how a session runs it), `tools/` (local checks).
- Add a template: new folder under `templates/`, with `scripts/bootstrap.mjs` taking `--template-dir --name --slug --purpose --visibility --region`. Prove it with `node tools/instantiate-local.mjs <out-dir>` (adapt the template path), then `npm ci && npm run lint && npm run typecheck && npm test && npm run build` in the output.
- Changes go through a branch + PR. Never commit secrets. The `web-app` template's shared process files come from the Typecast repo (`docs/project-kit/tools/build-kit.mjs --out`), do not hand-edit them here.
