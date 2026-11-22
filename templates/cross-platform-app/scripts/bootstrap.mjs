#!/usr/bin/env node
// Creates a complete new cross-platform-app project, with no manual step. Run by .github/workflows/new-project.yml (workflow_dispatch) in the kit repo.
//   node templates/cross-platform-app/scripts/bootstrap.mjs --template-dir templates/cross-platform-app --name "My App" --slug my-app --purpose "..." [--seed <name>] [--visibility private] [--dry-run] [--no-verify]
// Needs (kit repo secrets, set once): KIT_GH_TOKEN (PAT: administration, contents, workflows, secrets, issues on the new repo), VERCEL_TOKEN, VERCEL_TEAM_ID.
// No database and no backend: the repo, its secrets, a static Vercel project and the first issues are all there is to create. Secret values are never printed.
import { basename } from 'node:path';
import { baseVars, composeProject, readJson } from '../../../kit/lib/compose.mjs';
import { slugify, validateInputs } from '../../../kit/lib/core.mjs';
import { cli, createRepo, ghClient, makeApi, makeLog, needEnv, protectMain, pushFirstCommit, run, seedIssues, setRepoSecrets } from '../../../kit/lib/github.mjs';

const { arg, flag, dry: DRY } = cli();
const name = arg('name'), purpose = arg('purpose');
const templateDir = arg('template-dir', 'templates/cross-platform-app'), template = basename(templateDir), seed = arg('seed') || undefined;
const slug = arg('slug') || slugify(name ?? '');
const visibility = arg('visibility', 'private');
const problems = validateInputs({ name, slug, purpose, visibility });
if (problems.length) { console.error('Invalid input:\n- ' + problems.join('\n- ')); process.exit(2); }

const log = makeLog();
const need = needEnv(DRY);
const GH = need('KIT_GH_TOKEN'), VERCEL = need('VERCEL_TOKEN'), TEAM = need('VERCEL_TEAM_ID');
const KIT = process.env.GITHUB_REPOSITORY || 'esheliko/kickoff';
const OWNER = process.env.NEW_PROJECT_OWNER || KIT.split('/')[0];
const REPO = `${OWNER}/${slug}`;
const api = makeApi({ dry: DRY, log });
const gh = ghClient(api, GH);
const vercel = (m, p, b) => api('https://api.vercel.com', VERCEL, m, `${p}${p.includes('?') ? '&' : '?'}teamId=${TEAM}`, b);
const manifest = readJson(`${templateDir}/template.json`);

// 1. Empty repository.
const repoId = await createRepo({ gh, dry: DRY, owner: OWNER, slug, repo: REPO, visibility, purpose, log, templateLabel: templateDir + (seed ? ` + seed ${seed}` : '') });

// 2. Vercel project for the static web app. Not linked to git: CI builds the engine (Vercel's image has no Rust) and uploads the result.
log('creating Vercel project');
const vp = await vercel('POST', '/v11/projects', { name: slug, framework: null });
const vercelId = vp.id ?? '<project id>';

// 3. Repository secrets (values come from here, never from a file).
log('setting repository secrets');
setRepoSecrets({ dry: DRY, repo: REPO, token: GH, values: { VERCEL_TOKEN: VERCEL, VERCEL_ORG_ID: TEAM, VERCEL_PROJECT_ID: vercelId }, log });

// 4. Labels and the first issues.
const issues = await seedIssues({ gh, dry: DRY, repo: REPO, name, purpose, board: manifest.board });

// 5. Compose the project (kit/core + this template [+ seed]), verify, push the first commit to main.
const vars = baseVars({ name, slug, repo: REPO, purpose, repoId });
const fill = (out) => {
  const res = composeProject({ template, seed, out, vars });
  if (res.leftover.length) throw new Error(`unfilled placeholders: ${res.leftover.join(', ')}`);
};
if (DRY) { const tmp = `${process.env.TMPDIR || '/tmp'}/bootstrap-dry-${slug}`; fill(tmp); log(`DRY composed ${tmp} (placeholders all filled), would verify and push to ${REPO}`); }
else {
  const verify = flag('no-verify') ? null : (cwd) => { for (const [c, a] of manifest.verify.commands) run(c, a, { cwd, stdio: 'inherit' }); };
  pushFirstCommit({ repo: REPO, token: GH, purpose, fill, verify, log });
}

// 6. Branch protection.
await protectMain({ gh, repo: REPO, log });

log(`DONE ${DRY ? '(dry run) ' : ''}repo https://github.com/${REPO} | vercel project ${vercelId} | first task: issue #${issues[2] ?? 3}`);
