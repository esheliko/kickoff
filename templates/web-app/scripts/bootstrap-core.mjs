// Web-app-only pure helpers for scripts/bootstrap.mjs (Vercel + Supabase). Shared, stack-neutral helpers live in kit/lib/core.mjs.
// Unit tested in tests/unit/bootstrap.test.ts (kit-only: removed from generated projects).
import { validateInputs as validateCommon } from '../../../kit/lib/core.mjs';

/** Supabase region -> nearest Vercel function region (functions must stay next to the database). */
export const VERCEL_REGION = {
  'ap-south-1': 'bom1', 'ap-southeast-1': 'sin1', 'ap-northeast-1': 'hnd1', 'ap-southeast-2': 'syd1',
  'eu-west-1': 'dub1', 'eu-west-2': 'lhr1', 'eu-central-1': 'fra1', 'us-east-1': 'iad1', 'us-west-1': 'sfo1', 'sa-east-1': 'gru1',
};

export function validateInputs(input = {}) {
  const p = validateCommon(input);
  if (input.region && !VERCEL_REGION[input.region]) p.push(`region: one of ${Object.keys(VERCEL_REGION).join(', ')}`);
  return p;
}

/** Environment variables of the Vercel project. NEXT_PUBLIC_* are plain (they ship to the browser anyway), the rest are encrypted. */
export function vercelEnv({ url, anon, service }) {
  const target = ['production', 'preview', 'development'];
  return [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: url, type: 'plain', target },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: anon, type: 'plain', target },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', value: service, type: 'encrypted', target: ['production', 'preview'] },
  ];
}

/** GitHub Actions secrets of the new repo. Names only here; values come from the environment / created resources. */
export const secretNames = ['VERCEL_TOKEN', 'SUPABASE_ACCESS_TOKEN', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
