import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { baseVars, composeProject, expandVars, includeSnippets, listTemplates, readJson, KIT_ROOT } from '../lib/compose.mjs';
import { FILES, plan } from '../core/scripts/build-rules.mjs';

test('expandVars fills <<KEY>> everywhere and refuses a hole', () => {
  assert.deepEqual(expandVars({ a: ['x <<K>> y'], b: 1 }, { K: 'v' }), { a: ['x v y'], b: 1 });
  assert.throws(() => expandVars({ a: '<<MISSING>>' }, {}), /MISSING/);
});

test('includeSnippets replaces whole-line markers and refuses unknown snippets', () => {
  assert.equal(includeSnippets('a\n<!-- kit:include x -->\nb', { x: 'X\n' }), 'a\nX\nb');
  assert.throws(() => includeSnippets('<!-- kit:include nope -->', {}), /nope/);
});

test('kit/core rules carry no stack words: every template must supply them as ruleVars', () => {
  const raw = readFileSync(join(KIT_ROOT, 'kit/core/process/rules.json'), 'utf8');
  assert.doesNotMatch(raw, /vercel|supabase|next\.config|deploy-now/i);
  const used = new Set([...raw.matchAll(/<<([A-Z_]+)>>/g)].map((m) => m[1]));
  for (const t of listTemplates()) {
    const have = Object.keys(readJson(join(KIT_ROOT, 'templates', t, 'template.json')).ruleVars ?? {});
    assert.deepEqual([...used].filter((k) => !have.includes(k)), [], `template ${t} lacks ruleVars`);
  }
});

for (const template of listTemplates()) {
  test(`template ${template} composes into a consistent project`, () => {
    const out = join(mkdtempSync(join(tmpdir(), 'compose-')), 'p');
    const vars = baseVars({ name: 'Sample', slug: 'sample', repo: 'o/sample', purpose: 'A sample project for the kit.' });
    const res = composeProject({ template, out, vars: { ...vars, VERCEL_PROJECT_ID: 'p', VERCEL_TEAM_ID: 't' } });
    assert.deepEqual(res.leftover, [], 'every {{PLACEHOLDER}} is filled');
    for (const f of ['CLAUDE.md', 'process/rules.json', 'process/CHANGELOG.md', '.claude/settings.json', '.claude/hooks/session-start.sh', 'scripts/ci-status.mjs', 'scripts/bootstrap.mjs'.replace(/^/, '')]) {
      if (f === 'scripts/bootstrap.mjs') assert.ok(!existsSync(join(out, f)), 'kit-only bootstrap is removed');
      else assert.ok(existsSync(join(out, f)), `${f} exists`);
    }
    assert.ok(!existsSync(join(out, 'template.json')) && !existsSync(join(out, 'seed.json')));
    // the generated rule files are in sync with the rules (what `npm run lint` checks in the project)
    const cur = Object.fromEntries(['claude', 'session', 'prompt'].map((k) => [k, readFileSync(join(out, FILES[k]), 'utf8')]));
    assert.deepEqual(plan(readJson(join(out, FILES.rules)), cur).problems, []);
    assert.doesNotMatch(readFileSync(join(out, 'process/rules.json'), 'utf8'), /<<[A-Z_]+>>/);
    assert.ok(readdirSync(join(out, 'tests/unit')).includes('rules.test.ts'));
  });
}

test('a seed must belong to its template', () => {
  assert.throws(() => composeProject({ template: 'web-app', seed: 'no-such-seed', out: join(tmpdir(), 'x'), vars: {} }), /unknown seed/);
});

// GitHub fails a workflow that is not valid YAML instantly, with zero jobs and no message (a required check then never appears).
// `${{ }}` inside a one-line `{ }` mapping and an unquoted `: ` in a `run:` value both break the parse, so every workflow shipped to a project is parsed here.
test('every workflow file shipped by the kit is valid YAML with jobs', async () => {
  const { parse } = await import('yaml');
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') walk(p); } else if (/[\\/]\.github[\\/]workflows[\\/][^\\/]+\.ya?ml$/.test(p)) files.push(p); } };
  walk(KIT_ROOT);
  assert.ok(files.length >= 5, 'found the workflow files');
  for (const f of files) {
    let doc;
    assert.doesNotThrow(() => { doc = parse(readFileSync(f, 'utf8')); }, `${f} must parse as YAML`);
    assert.ok(doc && typeof doc.jobs === 'object' && Object.keys(doc.jobs).length > 0, `${f} defines jobs`);
  }
});
