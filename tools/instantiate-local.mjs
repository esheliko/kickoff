#!/usr/bin/env node
// Composes a template (kit/core + templates/<t> [+ seeds/<s>]) into a fresh folder exactly like the template's scripts/bootstrap.mjs does after the
// services exist, but with fake ids and no network. Used to prove the kit still produces a project that installs, lints, typechecks, tests and builds.
//   node tools/instantiate-local.mjs <template> <out-dir> ["Display Name"] ["purpose sentence"] [--seed <name>]
import { baseVars, composeProject, listTemplates, readJson, KIT_ROOT } from '../kit/lib/compose.mjs';
import { slugify } from '../kit/lib/core.mjs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const si = argv.indexOf('--seed');
const seed = si >= 0 ? argv.splice(si, 2)[1] : undefined;
const [template, out, name0, purpose0] = argv;
if (!template || !out) { console.error(`usage: instantiate-local.mjs <template> <out-dir> [name] [purpose] [--seed <name>]\ntemplates: ${listTemplates().join(', ')}`); process.exit(2); }
const seedInfo = seed ? readJson(join(KIT_ROOT, 'seeds', seed, 'seed.json')) : {};
const name = name0 ?? seedInfo.name ?? 'Sample App';
const purpose = purpose0 ?? seedInfo.purpose ?? 'A sample project used to check the kit.';
const slug = slugify(name);
const vars = { ...baseVars({ name, slug, repo: `owner/${slug}`, purpose }), VERCEL_PROJECT_ID: 'prj_test', VERCEL_TEAM_ID: 'team_test' };
const res = composeProject({ template, seed, out, vars });
if (res.leftover.length) { console.error(`unfilled placeholders: ${res.leftover.join(', ')}`); process.exit(1); }
console.log(`generated ${out} (template ${template}${seed ? `, seed ${seed}` : ''}; always-loaded rule text ~${res.tokens} tokens)`);
