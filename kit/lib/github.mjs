// Shared plumbing for every template's scripts/bootstrap.mjs: argument parsing, a small REST client, and the steps all projects share
// (empty repo, labels, first issues, first commit, branch protection). Service-specific steps (Vercel, Supabase, ...) stay in the template.
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LABELS, startIssues } from './core.mjs';

export function cli(argv = process.argv) {
  const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i > 0 ? argv[i + 1] : d; };
  const flag = (k) => argv.includes(`--${k}`);
  return { arg, flag, dry: flag('dry-run') };
}

export const makeLog = (tag = 'bootstrap') => (m) => console.log(`[${tag}] ${m}`);
export const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', ...opts });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** `need('KIT_GH_TOKEN')`: the value, or (dry run) a visible stand-in; a missing secret otherwise stops the run with its name (never its value). */
export const needEnv = (dry) => (k) => { const v = process.env[k]; if (!v && !dry) { console.error(`Missing secret/env ${k} (see the header of the template's scripts/bootstrap.mjs)`); process.exit(2); } return v ?? `<${k}>`; };

/** A JSON REST client. In a dry run it only logs the call. */
export function makeApi({ dry, log }) {
  return async function api(base, token, method, path, body, extra = {}) {
    if (dry) { log(`DRY ${method} ${base}${path}`); return {}; }
    const r = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', ...extra }, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text.slice(0, 300) }; }
    if (!r.ok) throw new Error(`${method} ${base}${path} -> ${r.status} ${JSON.stringify(json).slice(0, 300)}`);
    return json;
  };
}
export const ghClient = (api, token) => (m, p, b) => api('https://api.github.com', token, m, p, b, { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });

/** Step: an empty repository (the kit holds several templates, so the project is composed and pushed later instead of using GitHub's template copy). */
export async function createRepo({ gh, dry, owner, slug, repo, visibility, purpose, log, templateLabel }) {
  log(`creating ${repo} (${visibility}) from ${templateLabel}`);
  try { if (!dry) { await gh('GET', `/repos/${repo}`); console.error(`${repo} already exists: pick another name`); process.exit(2); } } catch (e) { if (!String(e.message).includes('404')) throw e; }
  const ownerType = dry ? 'User' : (await gh('GET', `/users/${owner}`)).type;
  const r = await gh('POST', ownerType === 'Organization' ? `/orgs/${owner}/repos` : '/user/repos', { name: slug, description: purpose.slice(0, 300), private: visibility === 'private' });
  return r.id ?? 0;
}

export function setRepoSecrets({ dry, repo, token, values, log }) {
  for (const [n, v] of Object.entries(values)) { if (dry) log(`DRY secret ${n}`); else run('gh', ['secret', 'set', n, '--repo', repo, '--body', v], { env: { ...process.env, GH_TOKEN: token } }); }
}

/** Step: labels and the first issues (#1 board and #2 CI status must come first). Returns the issue numbers. */
export async function seedIssues({ gh, dry, repo, name, purpose, board }) {
  for (const l of LABELS) await gh('POST', `/repos/${repo}/labels`, l);
  const issues = [];
  for (const i of startIssues({ name, purpose, board })) issues.push((await gh('POST', `/repos/${repo}/issues`, i)).number ?? '?');
  if (!dry && (issues[0] !== 1 || issues[1] !== 2)) throw new Error(`issue numbers are ${issues}: the board needs #1 and #2`);
  return issues;
}

/** Step: clone the empty repo, let `fill(dir)` compose the project into it, verify, commit, push main. */
export function pushFirstCommit({ repo, token, purpose, fill, verify, log }) {
  const dir = mkdtempSync(join(tmpdir(), 'newproj-'));
  run('git', ['clone', '-q', `https://x-access-token:${token}@github.com/${repo}.git`, dir]); // empty repo
  // compose wipes its target, so build next to the clone and move the .git folder in afterwards
  const staged = `${dir}-project`;
  fill(staged);
  run('cp', ['-a', join(dir, '.git'), join(staged, '.git')]);
  if (verify) { log('verifying the new project'); verify(staged); }
  const git = (...a) => run('git', ['-c', 'user.name=project-kit', '-c', 'user.email=project-kit@users.noreply.github.com', ...a], { cwd: staged });
  git('checkout', '-q', '-B', 'main'); git('add', '-A'); git('commit', '-q', '-m', `Initial project from project-kit\n\nPurpose: ${purpose.trim()}`); git('push', '-q', '-u', 'origin', 'main');
}

/** Step: the first commit really is on main (a push that was rejected or dropped must never end as a green run with an empty repo). */
export async function assertPushed({ gh, dry, repo, log }) {
  if (dry) return;
  let sha;
  try { sha = (await gh('GET', `/repos/${repo}/commits/main`)).sha; } catch (e) { throw new Error(`${repo} has no commit on main after the push: ${String(e.message).slice(0, 160)}. Check the token's permissions (contents + workflows write).`); }
  log(`first commit on main: ${String(sha).slice(0, 7)}`);
}

/** Step: branch protection, `verify` must pass. Returns null when applied, otherwise the reason (the caller finishes its other output and then fails the run: an unprotected main is not a success). */
export async function protectMain({ gh, repo, log }) {
  try { await gh('PUT', `/repos/${repo}/branches/main/protection`, { required_status_checks: { strict: false, contexts: ['verify'] }, enforce_admins: false, required_pull_request_reviews: null, restrictions: null }); log('main is protected (required check: verify)'); return null; }
  catch (e) {
    const m = String(e.message);
    const hint = /upgrade|public/i.test(m) ? 'private repositories on a free GitHub plan cannot have branch protection: use visibility=public or a paid plan' : /403|404/.test(m) ? "the token needs repository permission 'Administration: read and write'" : 'see the error';
    return `branch protection NOT applied (${hint}): ${m.slice(0, 200)}`;
  }
}
