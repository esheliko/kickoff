import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'yaml';

const T = 'templates/cross-platform-app';
const read = (p) => readFileSync(`${T}/${p}`, 'utf8');

test('cross-platform-app ships the deploy board (script, pure core, workflow, test, docs)', () => {
  for (const f of ['scripts/deploy-board.mjs', 'scripts/deploy-board-core.mjs', '.github/workflows/deploy-board.yml', 'tests/unit/deploy-board.test.ts']) assert.ok(existsSync(`${T}/${f}`), `${f} missing`);
  assert.match(read('DEPLOYING.md'), /## The deploy board/);
  assert.match(read('scripts/deploy-board-core.mjs'), /GITHUB_REPOSITORY \|\| '\{\{REPO\}\}'/);
});

test('the deploy-web step names are the ones the board reads', () => {
  const ci = parse(read('.github/workflows/ci.yml'));
  const names = ci.jobs['deploy-web'].steps.map((s) => s.name).filter(Boolean);
  for (const n of ['Deploy to Vercel', 'Skipped: no app change', 'Idle: VERCEL_TOKEN missing']) assert.ok(names.includes(n), `ci.yml deploy-web has no step "${n}"`);
  assert.equal(ci.jobs['deploy-web'].name, 'deploy-web');
  assert.equal(ci.jobs.verify.name, 'verify');
});

test('the board workflow is read-only apart from issues and runs after CI', () => {
  const w = parse(read('.github/workflows/deploy-board.yml'));
  assert.deepEqual(w.on.workflow_run.workflows, ['CI']);
  assert.equal(w.permissions.contents, 'read');
  assert.equal(w.permissions.issues, 'write');
});
