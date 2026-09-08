# Application hardening

Version 0.9.4 established the current hardening boundary: the browser UI and Canvas presentation stay in TypeScript while rules, capture/scoring, replay validation, and computer search live in one Rust crate, `crates/game-core`. Later releases, including the current 0.10.0 source, preserve that boundary; 0.9.4 was published as a distinct version rather than replacing 0.9.3 artifacts so native binaries remain traceable to their source revision.

## Trust boundary

`crates/game-core` is the only production implementation of:

- legal move application and turn changes;
- capture and house topology;
- capture-of-capture release and derived scoring;
- move-log replay validation;
- AI candidate generation, evaluation, threat/setup probes, search profiles, minimax, alpha-beta pruning, and forcing extensions.

The TypeScript layer owns UI, viewport, persistence transport, preferences, Worker orchestration, and DTO conversion. It does not implement parallel game rules or AI search.

Every human or computer coordinate is accepted only after the Rust core applies the authoritative move. Saved games contain only the versioned ordered move log and are rebuilt by Rust replay; score and capture geometry are never trusted from storage.

## Native path

Tauri links `game-core` directly and exposes four coarse commands:

- `core_create`;
- `core_move`;
- `core_replay`;
- `core_ai`.

AI search stays inside one Rust call. The frontend does not perform per-node IPC during minimax.

The native Vite build aliases the frontend to `core-native.ts` and does not ship the web WASM core.

## Web/PWA path

The web build compiles the same `game-core` crate to `wasm32-unknown-unknown`, generates minimal `wasm-bindgen` glue, then optimizes the module with Binaryen `wasm-opt -Oz --enable-bulk-memory --enable-sign-ext --strip-debug --strip-producers`.

The PWA uses the same four logical operations through `core-web.ts`. Expensive browser AI work remains in a cancellable Web Worker so the UI stays responsive. Worker responses are generation-scoped proposals and are still committed through the Rust move path.

WASM is not a secrecy boundary. A determined user can inspect or reverse engineer browser-delivered code. The purpose of the shared Rust/WASM architecture is to eliminate the easy-to-read TypeScript implementation, keep native and web behavior aligned, reduce duplicate logic, and raise the cost of casual reverse engineering without hostile anti-debugging behavior.

## Release hardening

Rust release builds use optimization, fat LTO, one codegen unit, `panic=abort`, symbol stripping, and disabled debug info.

Vite production builds are minified and emit no source maps. `scripts/verify-build.mjs` rejects source maps, TypeScript/test sources, legacy game-core identifiers, and a WASM core in native frontend assets. Web builds must contain the optimized Rust WASM module, Worker bundle, and required PWA/offline assets.

`scripts/verify-source-boundary.mjs` prevents the removed TypeScript `ai.ts`, `board.ts`, `capture.ts`, or `ai-match.ts` implementations from being reintroduced and rejects legacy algorithm imports/identifiers in production TypeScript.

Android release builds explicitly disable Java/JNI debugging, enable R8 optimization and resource shrinking, and disallow cleartext traffic. Release verification checks signing/package identity, manifest debug flags, native debug sections, exported game-core symbols, `arm64-v8a`, and 16 KB ELF `LOAD` alignment for 64-bit libraries.

macOS release verification checks the signed application identifier, universal `arm64`/`x86_64` executable, absence of dSYM/debug sections, and absence of exported game-core implementation symbols.

Automatic native builds are allowed only when the matching version tag is absent or resolves to the current push commit; an older tag for the same version causes the automatic rebuild to be skipped. Each native job records its actual checked-out source SHA and verifies the release tag again immediately before artifact upload, including manual rebuilds of historical tags. GitHub Release creation and RuStore asset attachment apply the same tag-to-commit provenance rule.

## CI and regression coverage

The permanent CI layers are complementary:

1. Rust unit/regression tests cover rule topology, captures/houses/releases, deterministic difficulty profiles, AI tactics, paired strength regressions, and large-position behavior.
2. Clippy runs with warnings denied for the Rust core.
3. Frontend session/persistence/stress tests execute against the compiled Rust WASM core rather than a JavaScript rules mock.
4. The production PWA build is verified after minification and WASM optimization.
5. Both committed Cargo lockfiles are scanned against RustSec on dependency changes and weekly. The game core denies every warning. The Tauri lock denies every warning outside a fixed reviewed baseline: GTK3/proc-macro/`glib` entries are allowed only while target-graph checks prove they are absent from Android/macOS, and five `unic-*` unmaintained advisories remain temporarily accepted through upstream `tauri-utils` → `urlpattern` 0.3. Any new RustSec warning fails CI.
6. Tauri compilation is checked with the platform prerequisites installed.
7. Every CI, audit, deploy, store, and release path validates exact npm dependency sources/integrity, the install-script allow/deny policy, and synchronized source versions before installation.
8. Required CI rejects unpinned external Actions/containers, persisted checkout credentials, `pull_request_target`, `write-all`, and the insecure Node runtime fallback; PR dependency changes also pass Dependency Review.
9. CodeQL analyzes JavaScript/TypeScript, while scheduled/PR Semgrep and full-history Gitleaks add independent static/secrets coverage.
10. Deploy and release workflows rebuild and retest the Rust/WASM core instead of trusting a pre-generated module.

## Deliberate non-goals

Dots does not add anti-debug, anti-Frida, emulator detection, debugger traps, root/jailbreak checks, encrypted code loaders, runtime self-modification, or other hostile client behavior. Such techniques add fragility and maintenance cost without making client-side logic secret.

No signing keys, tokens, private keys, or secrets are embedded in the repository or application. Android upload-key material remains supplied only through GitHub Actions secrets during release builds.

## Local toolchain

Web development and verification require:

- Node.js 22+ and npm 11+;
- a current Rust toolchain;
- target `wasm32-unknown-unknown`;
- `wasm-bindgen-cli` 0.2.127, matching the locked crate version;
- Binaryen (`wasm-opt`).

`npm run dev`, `npm test`, and `npm run build` generate the ignored `src/wasm` output automatically. `npm run build:native` intentionally does not generate or bundle WASM.
