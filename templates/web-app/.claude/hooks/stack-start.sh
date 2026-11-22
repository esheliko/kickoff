#!/usr/bin/env bash
# Sourced by session-start.sh (kit/core). Web-app: say plainly what smoke-test environment this session has.
# Smoke credentials: say plainly what this session has, so nobody claims they are "saved" when they are not. Names only, never values.
missing=""
for v in SMOKE_EMAIL SMOKE_PASSWORD NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do [ -z "${!v}" ] && missing="$missing $v"; done
if [ -n "$missing" ]; then
  echo "SMOKE ENV: missing in this session:$missing. 'npm run smoke' cannot sign in until they are set (CI has its own repo secrets). Do not say they are saved; see CLAUDE.md 'Smoke credentials'."
else
  echo "SMOKE ENV: all smoke variables are set; 'npm run smoke' can run here."
fi
