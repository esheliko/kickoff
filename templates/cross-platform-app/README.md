# {{NAME}}

{{PURPOSE}}

Rust engine (WebAssembly in browsers, native in apps) + TypeScript/React UI + Tauri 2 shells. Created from the kickoff `cross-platform-app` template: the development cycle, rules and automation are described in `CLAUDE.md` and `DEPLOYING.md`.

## Run it locally
You need Node 22+, a recent stable Rust (`rustup`), and the WebAssembly bindgen CLI:
```bash
cargo install wasm-bindgen-cli --version 0.2.130 --locked   # the version pinned in crates/wasm/Cargo.toml
npm ci
npm run dev        # http://localhost:5173
```

## Checks
```bash
npm run lint && npm run typecheck && npm test
npm run build && npm run smoke
```

## Desktop and mobile apps
```bash
npm run desktop:dev      # needs the webview libraries for your OS, see DEPLOYING.md
npm run desktop:build
```
