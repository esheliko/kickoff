// Stack-neutral pure helpers shared by every template's scripts/bootstrap.mjs and by tools/instantiate-local.mjs.
// Unit tested in kit/tests/core.test.ts. Anything that names a service (Vercel, Supabase, ...) lives in the template, not here.

export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');

/** Problems with the inputs every template shares (empty = fine). The display name is pasted into source files, so it is kept to safe characters. */
export function validateInputs({ name, slug, purpose, visibility } = {}) {
  const p = [];
  if (!name || !/^[A-Za-z0-9][A-Za-z0-9 &'.-]{0,38}[A-Za-z0-9.]$/.test(name) || name.includes("'")) p.push('name: 2-40 letters, digits, spaces, "-", "&" or "." (no quotes)');
  if (!slug || !/^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) p.push('slug: lowercase letters, digits and "-", 3-40 characters, starting with a letter');
  if (!purpose || String(purpose).trim().length < 10) p.push('purpose: at least a sentence');
  if (visibility && !['private', 'public'].includes(visibility)) p.push('visibility: private or public');
  return p;
}

/** Replaces every {{KEY}} that has a value; unknown placeholders are left in place and reported by `leftover`. */
export const substitute = (text, vars) => text.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
export const leftover = (text) => [...new Set([...text.matchAll(/\{\{([A-Z_]+)\}\}/g)].map((m) => m[1]))];

/** The three issues every project starts with, in this order: #1 is the template's board, #2 is fixed by scripts/ci-status.mjs, #3 is the first task. */
export function startIssues({ name, purpose, board }) {
  return [
    { title: board.title, body: board.body },
    { title: 'CI status of main', body: 'Maintained by `scripts/ci-status.mjs`. Do not edit by hand.' },
    { title: `First version of ${name}`, body: `## Purpose\n${purpose.trim()}\n\n## What to do\nRead CLAUDE.md and README.md, then propose a short plan (what you will build first and in what order) in a \`🔴 NEEDS YOU:\` reply if anything is ambiguous, otherwise build the first version through the normal branch + PR flow.\n\nThe repository and its CI secrets already exist: do not create them.` },
  ];
}
export const LABELS = [
  { name: 'process-request', color: 'fbca04', description: 'A rule/hook/CI/deploy change for the next process session' },
  { name: 'automation-data', color: 'ededed', description: 'Machine-written automation board data' },
];
