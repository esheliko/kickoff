import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, validateInputs, substitute, leftover, startIssues } from '../lib/core.mjs';

test('slugify makes a safe repo name', () => {
  assert.equal(slugify('My Cool App!'), 'my-cool-app');
  assert.equal(slugify('  --Café  Tracker-- '), 'cafe-tracker');
  assert.ok(slugify('x'.repeat(80)).length <= 40);
});

test('validateInputs names every problem', () => {
  const ok = { name: 'Overcut', slug: 'overcut', purpose: 'A free media editor for every device.', visibility: 'private' };
  assert.deepEqual(validateInputs(ok), []);
  assert.ok(validateInputs({ ...ok, name: "It's" }).some((m) => m.startsWith('name')));
  assert.ok(validateInputs({ ...ok, slug: 'Bad Slug' }).some((m) => m.startsWith('slug')));
  assert.ok(validateInputs({ ...ok, purpose: 'short' }).some((m) => m.startsWith('purpose')));
  assert.ok(validateInputs({ ...ok, visibility: 'secret' }).some((m) => m.startsWith('visibility')));
  assert.ok(validateInputs({}).length >= 3);
});

test('substitute fills known placeholders and reports unknown ones', () => {
  assert.equal(substitute('# {{NAME}} ({{SLUG}})', { NAME: 'A', SLUG: 'a' }), '# A (a)');
  assert.deepEqual(leftover(substitute('{{NAME}} {{OTHER}} {{OTHER}}', { NAME: 'A' })), ['OTHER']);
  assert.equal(substitute('{{NAME}}', { NAME: '$&' }), '$&'); // no replacement-pattern surprises
});

test('the first issues keep #1 for the board and #2 for CI status', () => {
  const i = startIssues({ name: 'A', purpose: 'Do a thing well.', board: { title: 'Release board', body: 'b' } });
  assert.equal(i.length, 3);
  assert.equal(i[0].title, 'Release board');
  assert.match(i[1].title, /CI/);
  assert.match(i[2].body, /Do a thing well\./);
});
