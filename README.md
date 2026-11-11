# turbolists

A packing-list app. Define items, group them into kits (e.g. "beach", "cold weather"), and combine kits into trips to get a checklist. Add items to your library, reuse trips with a fresh checklist, and archive past trips while keeping their progress.

## Layout

- `packages/core`: domain logic (items, kits, trips, store, views). Plain TypeScript, run and tested with Deno.
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

For builds driven by Xcode or XcodeBuildMCP, keep Tauri’s development bridge running in a terminal first:

```sh
cd packages/app
PATH="$HOME/.cargo/bin:$PATH" deno task tauri ios dev --open --no-watch
```

Then build and run `src-tauri/gen/apple/app.xcodeproj`, scheme `app_iOS`, on your simulator. The bridge also runs Vite for live UI updates. Ensure Xcode’s build environment can find `cargo` and `deno`.

## Tasks

From the repo root:

| Command              | What it does                     |
| -------------------- | -------------------------------- |
| `deno task dev`      | Run the desktop app in dev mode  |
| `deno task dev:ios`  | Run on the iOS simulator         |
| `deno task test`     | Run core and app state tests     |
| `deno task test:ui`  | Verify motion and haptic dispatch in mobile WebKit |
| `deno task typecheck`| Typecheck core                   |

From `packages/app`: `deno task build` (typecheck + vite build), `deno task tauri build` (bundle the app).

## Simulator automation

The app uses `WKWebView`, whose controls live in a separate accessibility process.
The project’s `.xcodebuildmcp/config.yaml` selects `tools/axe-web`, an AXe adapter
that enables remote content discovery. Agents can use ordinary `snapshot_ui`,
`tap`, `type_text`, `swipe`, and `wait_for_ui` calls with element references.
The adapter uses native accessibility to scroll tapped controls into view before
sending input, including controls clipped by inner scroll areas. No app test hooks or JavaScript injection are needed.
Native popovers expose a `dismiss popup` target whose tap area stays outside the
popup, so agents can cancel the iOS share sheet through MCP.

After installing Xcode, Deno, Node/npm, and an iOS simulator:

```sh
deno task setup:ios-testing
```

This installs the pinned XcodeBuildMCP tooling if needed and compiles a small
snapshot helper against its existing frameworks. Private compile-time headers
are downloaded from a pinned idb revision. Build files stay in the ignored
`.xcodebuildmcp/cache/` directory; installed packages are not modified. Rerun setup
after changing Xcode, relocating the npm cache, or editing the Swift helper.

Start the Tauri bridge as described above, then build/run the app with MCP.
Restart an already-running MCP server once so it reads the project configuration.
For a different simulator, update `simulatorName` in the project configuration or
use MCP’s session defaults.

```sh
deno task test:ios
```

The smoke test connects to a real MCP server, drives the installed simulator app,
creates a library item and a kit, searches and packs a trip, verifies
the native share sheet without sending anything, saved progress and archive state
after restarting the app, reuses a trip with
independent progress, checks reset confirmation and Undo across tabs, and removes
its own test data. Existing lists are retained. If a test fails, it prints the unique suffix of any test data left
for inspection. Keep the simulator free of manual input while this test runs.
