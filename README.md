# turbolists

A packing-list app. Define items, group them into facets (e.g. "beach", "cold weather"), and combine facets into trips to get a checklist.

## Layout

- `packages/core`: domain logic (items, facets, trips, store, views). Plain TypeScript, run and tested with Deno.
- `packages/app`: Tauri desktop app with a Lit + Vite frontend. Imports core via the `@turbolists/core/*` alias. Data is persisted to `store.json` in the app data dir via Rust commands.

## Prerequisites

- [Deno](https://deno.com) 2.x
- [Rust](https://rustup.rs) (stable), plus the Tauri [system prerequisites](https://v2.tauri.app/start/prerequisites/) (on macOS: Xcode Command Line Tools)

## Getting started

```sh
deno install
deno task dev        # launches the Tauri app (vite on :1420)
```

Deno manages the app's npm dependencies too (`nodeModulesDir: auto`), so there's no separate Node/pnpm install. The first run compiles the Rust side and takes a few minutes.

## iOS

Needs full Xcode (with an iOS simulator runtime), CocoaPods (`brew install cocoapods`), and the iOS Rust targets:

```sh
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
deno task dev:ios    # pick a simulator, or pass one: deno task dev:ios "iPhone 17 Pro"
```

The Xcode project lives in `packages/app/src-tauri/gen/apple`. Running on a physical device needs `bundle > iOS > developmentTeam` set in `tauri.conf.json`.

## Tasks

From the repo root:

| Command              | What it does                     |
| -------------------- | -------------------------------- |
| `deno task dev`      | Run the desktop app in dev mode  |
| `deno task dev:ios`  | Run on the iOS simulator         |
| `deno task test`     | Run core tests                   |
| `deno task typecheck`| Typecheck core                   |

From `packages/app`: `deno task build` (typecheck + vite build), `deno task tauri build` (bundle the app).
