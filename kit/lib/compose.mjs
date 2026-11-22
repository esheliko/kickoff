// Builds a project folder from layers, later layers overwriting earlier ones file by file:
//   1. kit/core/            the work model every project gets (rules, hooks, process skill, CI-status scripts, tests of those)
//   2. templates/<name>/    one technology stack (its manifest is template.json)
//   3. seeds/<name>/        optional: project-specific starter content on top of a template (docs, extra modules); manifest seed.json;
//                           CLAUDE.seed.md is merged into CLAUDE.md at the template's `<!-- kit:seed -->` line
// Then, in order: kit:include snippets in CLAUDE.md, <<RULE_VARS>> in process/rules.json, {{PLACEHOLDERS}} everywhere,
// regeneration of the standing-rule blocks (CLAUDE.md, .claude/hooks/rules-*.txt), removal of kit-only files.
// Used by every template's scripts/bootstrap.mjs and by tools/instantiate-local.mjs. Tested in kit/tests/compose.test.mjs.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leftover, substitute } from './core.mjs';
import { plan, FILES } from '../core/scripts/build-rules.mjs';

export const KIT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFESTS = new Set(['template.json', 'seed.json']);

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const listTemplates = (root = KIT_ROOT) => readdirSync(join(root, 'templates')).filter((n) => existsSync(join(root, 'templates', n, 'template.json')));

/** Pure: `<<KEY>>` in every string of a parsed JSON value; an unknown key is an error (a rule must never ship with a hole in it). */
export function expandVars(value, vars, where = 'value') {
  if (typeof value === 'string') {
    return value.replace(/<<([A-Z_]+)>>/g, (m, k) => {
      if (!(k in vars)) throw new Error(`${where}: <<${k}>> has no value in template.json "ruleVars"`);
      return String(vars[k]);
    });
  }
  if (Array.isArray(value)) return value.map((v, i) => expandVars(v, vars, `${where}[${i}]`));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expandVars(v, vars, `${where}.${k}`)]));
  return value;
}

/** Pure: `<!-- kit:include NAME -->` lines replaced by snippets[NAME]; an unknown name is an error. */
export function includeSnippets(text, snippets) {
  return text.replace(/^<!-- kit:include ([a-z0-9-]+) -->$/gm, (m, n) => {
    if (!(n in snippets)) throw new Error(`CLAUDE.md includes unknown kit snippet "${n}" (kit/snippets/${n}.md)`);
    return snippets[n].replace(/\n+$/, '');
  });
}

function overlay(from, to) {
  cpSync(from, to, { recursive: true, filter: (src) => !MANIFESTS.has(src.slice(from.length + 1)) });
}

function walkText(dir, fn) {
  for (const f of readdirSync(dir)) {
    if (f === '.git' || f === 'node_modules') continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { walkText(p, fn); continue; }
    let t; try { t = readFileSync(p, 'utf8'); } catch { continue; }
    if (t.includes('\u0000')) continue;
    fn(p, t);
  }
}

/**
 * @param {{template: string, out: string, vars: Record<string,string|number>, seed?: string, root?: string}} o
 * @returns {{leftover: string[], tokens: number, manifest: object, seedManifest: object|null}}
 */
export function composeProject({ template, out, vars, seed, root = KIT_ROOT }) {
  const tdir = join(root, 'templates', template);
  if (!existsSync(join(tdir, 'template.json'))) throw new Error(`unknown template "${template}" (have: ${listTemplates(root).join(', ')})`);
  const manifest = readJson(join(tdir, 'template.json'));
  let seedManifest = null, sdir = null;
  if (seed) {
    sdir = join(root, 'seeds', seed);
    if (!existsSync(join(sdir, 'seed.json'))) throw new Error(`unknown seed "${seed}"`);
    seedManifest = readJson(join(sdir, 'seed.json'));
    if (seedManifest.template !== template) throw new Error(`seed "${seed}" is for template "${seedManifest.template}", not "${template}"`);
  }
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  overlay(join(root, 'kit', 'core'), out);
  overlay(tdir, out);
  if (sdir) overlay(sdir, out);

  // kit-only files go first, so their sample placeholders are neither filled nor reported
  for (const p of [...(manifest.templateOnly ?? []), ...(seedManifest?.templateOnly ?? [])]) rmSync(join(out, p), { recursive: true, force: true });

  const snippets = Object.fromEntries(readdirSync(join(root, 'kit', 'snippets')).map((f) => [f.replace(/\.md$/, ''), readFileSync(join(root, 'kit', 'snippets', f), 'utf8')]));
  const claudePath = join(out, FILES.claude);
  // A seed may add project-specific CLAUDE.md sections: its CLAUDE.seed.md replaces the `<!-- kit:seed -->` line (the line is dropped when there is no seed).
  const seedSectionsPath = join(out, 'CLAUDE.seed.md');
  const seedSections = existsSync(seedSectionsPath) ? readFileSync(seedSectionsPath, 'utf8').replace(/\n+$/, '') : '';
  rmSync(seedSectionsPath, { force: true });
  const claudeText = includeSnippets(readFileSync(claudePath, 'utf8'), snippets).replace(/^<!-- kit:seed -->\n+/m, seedSections ? seedSections + '\n\n' : '');
  writeFileSync(claudePath, claudeText);

  const ruleVars = { ...manifest.ruleVars, ...seedManifest?.ruleVars };
  const rulesPath = join(out, FILES.rules);
  const rulesDoc = expandVars(readJson(rulesPath), ruleVars, 'process/rules.json');
  const budget = seedManifest?.alwaysLoadedTokens ?? manifest.alwaysLoadedTokens; // a stack with two toolchains legitimately needs more always-loaded text
  if (budget) rulesDoc.budget.alwaysLoadedTokens = budget;
  writeFileSync(rulesPath, JSON.stringify(rulesDoc, null, 2) + '\n');

  const left = new Set();
  walkText(out, (p, t) => {
    const o = substitute(t, vars);
    leftover(o).forEach((k) => left.add(k));
    if (o !== t) writeFileSync(p, o);
  });

  const doc = readJson(rulesPath);
  const read = (f) => readFileSync(join(out, f), 'utf8');
  const res = plan(doc, { claude: read(FILES.claude), session: '', prompt: '' });
  writeFileSync(claudePath, res.want.claude);
  writeFileSync(join(out, FILES.session), res.want.session);
  writeFileSync(join(out, FILES.prompt), res.want.prompt);
  const overBudget = res.problems.filter((m) => m.includes('budget'));
  if (overBudget.length) throw new Error(overBudget.join('\n'));

  return { leftover: [...left], tokens: res.tokens, manifest, seedManifest };
}

/** The placeholder values every project gets. Template-specific ones (ids of created services) are added by the caller. */
export const baseVars = ({ name, slug, repo, purpose, repoId = 1, today = new Date().toISOString().slice(0, 10) }) => ({ NAME: name, SLUG: slug, REPO: repo, OWNER: repo.split('/')[0], PURPOSE: purpose.trim(), REPO_ID: repoId, TODAY: today });
