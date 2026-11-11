# turbolists

A packing-list app. Define items, group them into kits (e.g. "beach", "cold weather"), and combine kits into trips to get a checklist. Add items to your library, reuse trips with a fresh checklist, and archive past trips while keeping their progress.

Turbolists is a native **SwiftUI** iOS app, in [`swift/`](swift/). The original Tauri/Lit app in `packages/` is kept for reference only and is no longer developed.

## Layout

- `swift/TurbolistsCore`: domain logic (items, kits, trips, library, checklist helpers) as a Swift package.
- `swift/Turbolists`: the SwiftUI app. State lives in an [ObservableStore](https://github.com/subconsciousnetwork/ObservableStore) store; data is saved as JSON in Application Support.
- `swift/AppLogic`: macOS package that runs the app's store tests without the simulator.
- `packages/`: the old Tauri/Lit app (reference only; see below).

## Prerequisites

- Xcode 26 with an iOS 26 simulator runtime
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)

## Getting started

```sh
cd swift
./dev.sh run     # generate the Xcode project, build, install and launch on the simulator
./dev.sh test    # core + store tests on macOS, about a second
```

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `./dev.sh run`      | Build, install and relaunch on the simulator         |
| `./dev.sh build`    | Build only                                           |
| `./dev.sh test`     | Core and store tests on macOS                        |
| `./dev.sh test-sim` | App tests on the iOS simulator                       |

`SIM=<name|udid>` picks the simulator (default `iPhone 17 Pro`). More detail, including build timings, is in [`swift/README.md`](swift/README.md). To open the project in Xcode, run `./dev.sh gen` and open `swift/Turbolists/Turbolists.xcodeproj`.

## Reference: the Tauri/Lit app

Everything below describes the original implementation. It still builds and runs, but it is frozen: use it to check how something used to behave.

### Layout (Tauri)

- `packages/core`: domain logic (items, kits, trips, store, views). Plain TypeScript, run and tested with Deno.
- `packages/app`: Tauri desktop app with a Lit + Vite frontend. Imports core via the `@turbolists/core/*` alias. Data is persisted to `store.json` in the app data dir via Rust commands.

### Prerequisites

- [Deno](https://deno.com) 2.x
- [Rust](https://rustup.rs) (stable), plus the Tauri [system prerequisites](https://v2.tauri.app/start/prerequisites/) (on macOS: Xcode Command Line Tools)

### Getting started

```sh
deno install
deno task dev        # launches the Tauri app (vite on :1420)
```

Deno manages the app's npm dependencies too (`nodeModulesDir: auto`), so there's no separate Node/pnpm install. The first run compiles the Rust side and takes a few minutes.

### iOS

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

### Tasks

From the repo root:

| Command              | What it does                     |
| -------------------- | -------------------------------- |
| `deno task dev`      | Run the desktop app in dev mode  |
| `deno task dev:ios`  | Run on the iOS simulator         |
| `deno task test`     | Run core and app state tests     |
| `deno task typecheck`| Typecheck core                   |

From `packages/app`: `deno task build` (typecheck + vite build), `deno task tauri build` (bundle the app).

The old app's WebView simulator tooling (`tools/axe-web` and the `test:ios` smoke test)
was removed; it was last present in commit `fafa22d`.
