#!/usr/bin/env node
// Creates a complete new web-app project, with no manual step. Run by .github/workflows/new-project.yml (workflow_dispatch) in the kit repo.
//   node templates/web-app/scripts/bootstrap.mjs --template-dir templates/web-app --name "My App" --slug my-app --purpose "..." [--seed <name>] [--visibility private] [--region ap-south-1] [--dry-run] [--no-verify]
// Needs (kit repo secrets, set once): KIT_GH_TOKEN (PAT: administration, contents, workflows, secrets, issues on the new repo; "repo"+"workflow" classic scopes also work),
// VERCEL_TOKEN, VERCEL_TEAM_ID, SUPABASE_ACCESS_TOKEN, SUPABASE_ORG_ID, KIT_OWNER_EMAIL. Secret values are never printed.
// The generic steps (repo, issues, first commit, branch protection) and the project composition live in kit/lib; this file only adds Vercel and Supabase.
import { randomBytes } from 'node:crypto';
import { basename } from 'node:path';
import { baseVars, composeProject, readJson } from '../../../kit/lib/compose.mjs';
import { slugify } from '../../../kit/lib/core.mjs';
import { assertPushed, cli, createRepo, ghClient, makeApi, makeLog, needEnv, protectMain, pushFirstCommit, run, seedIssues, setRepoSecrets, sleep } from '../../../kit/lib/github.mjs';
import { VERCEL_REGION, secretNames, validateInputs, vercelEnv } from './bootstrap-core.mjs';

const { arg, flag, dry: DRY } = cli();
const name = arg('name'), purpose = arg('purpose');
const templateDir = arg('template-dir', 'templates/web-app'), template = basename(templateDir), seed = arg('seed') || undefined;
const slug = arg('slug') || slugify(name ?? '');
const visibility = arg('visibility', 'private'), region = arg('region', 'ap-south-1');
const problems = validateInputs({ name, slug, purpose, visibility, region });
if (problems.length) { console.error('Invalid input:\n- ' + problems.join('\n- ')); process.exit(2); }

const log = makeLog();
const need = needEnv(DRY);
const GH = need('KIT_GH_TOKEN'), VERCEL = need('VERCEL_TOKEN'), TEAM = need('VERCEL_TEAM_ID'), SUPA = need('SUPABASE_ACCESS_TOKEN'), ORG = need('SUPABASE_ORG_ID'), EMAIL = need('KIT_OWNER_EMAIL');
const KIT = process.env.GITHUB_REPOSITORY || 'esheliko/kickoff';
const OWNER = process.env.NEW_PROJECT_OWNER || KIT.split('/')[0];
const REPO = `${OWNER}/${slug}`;
const api = makeApi({ dry: DRY, log });
const gh = ghClient(api, GH);
const vercel = (m, p, b) => api('https://api.vercel.com', VERCEL, m, `${p}${p.includes('?') ? '&' : '?'}teamId=${TEAM}`, b);
const supa = (m, p, b) => api('https://api.supabase.com', SUPA, m, p, b);
const manifest = readJson(`${templateDir}/template.json`);

// 1. Empty repository.
const repoId = await createRepo({ gh, dry: DRY, owner: OWNER, slug, repo: REPO, visibility, purpose, log, templateLabel: templateDir + (seed ? ` + seed ${seed}` : '') });

// 2. Supabase project (database + auth), sign-up off, the owner invited.
log(`creating Supabase project in ${region}`);
const dbPass = randomBytes(24).toString('base64url');
const proj = await supa('POST', '/v1/projects', { name: slug, organization_id: ORG, db_pass: dbPass, region });
const ref = proj.id ?? proj.ref ?? 'dryrun';
for (let i = 0; !DRY && i < 60; i++) { const s = await supa('GET', `/v1/projects/${ref}`); if (s.status === 'ACTIVE_HEALTHY') break; if (i === 59) throw new Error('Supabase project did not become healthy in 10 min'); await sleep(10_000); }
const keys = DRY ? [] : await supa('GET', `/v1/projects/${ref}/api-keys`);
const key = (n) => keys.find((k) => k.name === n)?.api_key ?? `<${n}>`;
const supabase = { url: `https://${ref}.supabase.co`, anon: key('anon'), service: key('service_role') };
await supa('PATCH', `/v1/projects/${ref}/config/auth`, { disable_signup: true });
if (!DRY) await fetch(`${supabase.url}/auth/v1/invite`, { method: 'POST', headers: { apikey: supabase.service, Authorization: `Bearer ${supabase.service}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: EMAIL }) }).then((r) => { if (!r.ok) log(`owner invite failed (${r.status}): invite them from the Supabase dashboard`); });

// 3. Vercel project, linked to the repo, env vars set, functions next to the database.
log('creating Vercel project');
const vp = await vercel('POST', '/v11/projects', { name: slug, framework: 'nextjs', gitRepository: { type: 'github', repo: REPO }, serverlessFunctionRegion: VERCEL_REGION[region] });
const vercelId = vp.id ?? '<project id>';
for (const e of vercelEnv(supabase)) await vercel('POST', `/v10/projects/${vercelId}/env`, e);

// 4. Repository secrets (values come from here, never from a file).
log('setting repository secrets');
const secretValues = { VERCEL_TOKEN: VERCEL, SUPABASE_ACCESS_TOKEN: SUPA, NEXT_PUBLIC_SUPABASE_URL: supabase.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anon, SUPABASE_SERVICE_ROLE_KEY: supabase.service };
setRepoSecrets({ dry: DRY, repo: REPO, token: GH, values: Object.fromEntries(secretNames.map((n) => [n, secretValues[n]])), log });

// 5. Labels and the first issues.
const issues = await seedIssues({ gh, dry: DRY, repo: REPO, name, purpose, board: manifest.board });

// 6. Compose the project (kit/core + this template [+ seed]), verify, push the first commit to main.
const vars = { ...baseVars({ name, slug, repo: REPO, purpose, repoId }), VERCEL_PROJECT_ID: vercelId, VERCEL_TEAM_ID: TEAM };
const fill = (out) => {
  const res = composeProject({ template, seed, out, vars });
  if (res.leftover.length) throw new Error(`unfilled placeholders: ${res.leftover.join(', ')}`);
};
if (DRY) { const tmp = `${process.env.TMPDIR || '/tmp'}/bootstrap-dry-${slug}`; fill(tmp); log(`DRY composed ${tmp} (placeholders all filled), would verify and push to ${REPO}`); }
else {
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: supabase.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anon };
  const verify = flag('no-verify') ? null : (cwd) => { for (const [c, a] of manifest.verify.commands) run(c, a, { cwd, env, stdio: 'inherit' }); };
  pushFirstCommit({ repo: REPO, token: GH, purpose, fill, verify, log });
}
await assertPushed({ gh, dry: DRY, repo: REPO, log });

// 7. Branch protection.
const unprotected = await protectMain({ gh, repo: REPO, log });

log(`DONE ${DRY ? '(dry run) ' : ''}repo https://github.com/${REPO} | vercel project ${vercelId} | supabase ${ref} | first task: issue #${issues[2] ?? 3}`);
if (unprotected) { console.error(`::error::${unprotected}`); process.exit(1); }
