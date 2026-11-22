#!/usr/bin/env node
// Composes a template (+ optional seed) and runs the template's own verify commands in the result (template.json "verify.commands"),
// plus a build for templates that declare "verify.build". This is what the kit CI runs per template.
//   node tools/check-template.mjs <template> <out-dir> [--seed <name>] [--build]
import { execFileSync } from 'node:child_process';
import { baseVars, composeProject, readJson, KIT_ROOT } from '../kit/lib/compose.mjs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const si = argv.indexOf('--seed');
const seed = si >= 0 ? argv.splice(si, 2)[1] : undefined;
const build = argv.includes('--build') && argv.splice(argv.indexOf('--build'), 1);
const [template, out] = argv;
if (!template || !out) { console.error('usage: check-template.mjs <template> <out-dir> [--seed <name>] [--build]'); process.exit(2); }
const seedInfo = seed ? readJson(join(KIT_ROOT, 'seeds', seed, 'seed.json')) : {};
const name = seedInfo.name ?? 'Sample App';
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const vars = { ...baseVars({ name, slug, repo: `owner/${slug}`, purpose: seedInfo.purpose ?? 'A sample project used to check the kit.' }), VERCEL_PROJECT_ID: 'prj_test', VERCEL_TEAM_ID: 'team_test' };
const res = composeProject({ template, seed, out, vars });
if (res.leftover.length) { console.error(`unfilled placeholders: ${res.leftover.join(', ')}`); process.exit(1); }
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dummy' };
for (const [c, a] of [...res.manifest.verify.commands, ...(build ? [['npm', ['run', 'build']]] : [])]) { console.log(`$ ${c} ${a.join(' ')}`); execFileSync(c, a, { cwd: out, env, stdio: 'inherit' }); }
console.log(`OK ${template}${seed ? ` + ${seed}` : ''}`);
