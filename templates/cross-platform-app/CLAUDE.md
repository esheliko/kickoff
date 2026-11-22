# {{NAME}}: developer notes

<!-- rules:begin (GENERATED from process/rules.json: edit there, then `npm run rules:build`) -->
<!-- rules:end -->

## What this project is
{{PURPOSE}}

One codebase for every platform: a **Rust engine** (`crates/`) compiled to WebAssembly for browsers and used natively inside **Tauri 2** shells (`apps/desktop`: Windows, macOS, Linux, and iOS/Android via `tauri ios|android init`), with one **TypeScript + React UI** (`apps/web`, also the installable PWA). No backend: everything runs on the user's device. See README.md for setup and `DEPLOYING.md` for shipping.

## Layout
- `crates/core` (`app-core`): the engine's pure logic. No platform crates, no I/O except through traits. Everything testable lives here.
- `crates/wasm` (`app-wasm`): thin wasm-bindgen bindings. Forward to `app-core`; no logic.
- `apps/desktop/src-tauri`: native shell and its commands. Own Cargo workspace (needs webview libraries), thin like `crates/wasm`.
- `packages/engine-client` (`@app/engine-client`): the typed `Engine` interface and its two backends (`wasm.ts`, `tauri.ts`). **The only door from UI to engine.**
- `apps/web` (`@app/web`): the UI (React 19, Vite). Responsive from phone to ultrawide; keyboard and touch both first-class.
- `scripts/`: tooling (`build-wasm`, `check-boundaries`, `smoke`, `shot`, `vercel-output`, rules/CI helpers).
- `docs/`: architecture, roadmap, decisions (create what the project needs; per-feature rules in `docs/features/<feature>.md`).

## Commands
- `npm ci` once. `npm run dev` (builds the engine, serves the web app on :5173), `npm run build` (engine + web, output `apps/web/dist`), `npm run typecheck`, `npm run lint` (eslint, boundaries, rules sync, rustfmt, clippy `-D warnings`), `npm test` (TypeScript + `cargo test --workspace`), `npm run smoke` (Playwright against the build, desktop and phone viewports).
- Engine only: `cargo test -p app-core`, `cargo clippy --workspace --all-targets`. Build the wasm package alone: `npm run build:wasm` (needs the `wasm-bindgen` CLI at the version pinned in `crates/wasm/Cargo.toml`; `--dev` skips optimisation).
- Desktop: `npm run desktop:dev` / `desktop:build` (needs the platform webview libraries: `DEPLOYING.md`).

## Conventions
- **Boundaries** (enforced by `npm run lint`, `scripts/check-boundaries.mjs`): the core depends on no platform crate; only `engine-client` imports the wasm package or `@tauri-apps/*`; UI never imports Rust paths. New capability = Rust function in `app-core` + binding in `crates/wasm` AND a command in `src-tauri` + method on `Engine` + both backends + a test. Never one platform only.
- **Cross-boundary data** is JSON or typed buffers described in `packages/engine-client/src/types.ts`; bump `ABI_VERSION` (core) and `EXPECTED_ABI` (client) together on an incompatible change. Large media data never goes through JSON.
- **Performance is a feature**: nothing heavy on the UI thread (engine work runs in a Worker on the web), no per-frame allocation in hot paths, measure before and after (`docs/` holds the budgets once they exist). A change that makes the app slower than its budget is a bug.
- **Every screen size**: no horizontal page scroll at 320 px, touch targets >= 44 px, safe-area insets respected, no hover-only controls. The smoke test checks overflow at phone and desktop widths; screenshot visual changes at both.
- **Free and private by default**: no accounts, no tracking, no paywalled feature, works offline. Anything that needs a server is optional, documented, and has a local fallback.
- Pure logic goes in Rust (`crates/core`, unit test next to it) or `packages/*` (test in `tests/unit/`); every new screen/flow gets a smoke step in `tests/smoke/`.
- Decorative or optional sections must fail soft: catch and render nothing or a small note, never take the app down.
- Verification: `npm run lint && npm run typecheck && npm test`; CI `verify` also runs the wasm build, the web build and smoke.

<!-- kit:include token-cost -->

<!-- kit:include screenshots -->

<!-- kit:seed -->

## Known gaps
- (none yet: list what is thin or missing so the next session does not assume it exists. Tauri mobile targets are not initialised until someone runs `tauri ios init` / `tauri android init`; the desktop shell is only compile-checked in CI, not covered by smoke tests.)

## Workflow
See the standing rule at the top: every change is a branch + PR, merged when its CI is green; a merge to `main` deploys the web app; native apps ship from version tags. No direct pushes to `main`.
