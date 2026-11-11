# Turbolists (SwiftUI)

- `TurbolistsCore/` — Swift package: pure domain logic ported from `packages/core`.
- `Turbolists/` — SwiftUI iOS app (XcodeGen `project.yml`). Bundle ID `com.turbolists.swiftui`. iOS 26+.
- `AppLogic/` — macOS-only SwiftPM wrapper that symlinks `Turbolists/Sources/Store` (as module
  `Turbolists`) and `Turbolists/Tests`, so the app's store tests run with `swift test`, without the simulator.

State management: [ObservableStore](https://github.com/subconsciousnetwork/ObservableStore) (Elm-style store, Combine effects).

## Dev loop: `./dev.sh`

```sh
./dev.sh run        # xcodegen (only if needed) + build + install + relaunch on the simulator
./dev.sh build      # same, without install/launch
./dev.sh launch     # reinstall + relaunch the last build
./dev.sh test       # app store tests (16) + core tests (142) on macOS, in parallel, ~1s warm
./dev.sh test-app   # app store tests only (macOS)
./dev.sh test-core  # TurbolistsCore tests only (macOS)
./dev.sh test-sim   # app tests on the iOS simulator (authoritative, ~4.5s warm)
```

- `SIM=<udid|name>` picks the simulator (default `iPhone 17 Pro`; booted if needed). When several
  agents work at once, give each one its own simulator **and** `DERIVED_DATA=<path>` (default
  `Turbolists/.build/dd`); parallel xcodebuilds on one derived-data folder block each other.
- Output is quiet (warnings, errors, test summary) and ends with per-phase timings.
  `VERBOSE=1` shows full xcodebuild / swift test output.
- Use `test` while iterating; run `test-sim` before handing off, since `test` runs on macOS.
- `run` and `test-sim` share build settings, so switching between them does not rebuild.
  Building the same derived data from Xcode or MobileBuildMCP with different settings (e.g. the index
  store on) recompiles ~1s worth on the next switch.

## Measurements

Apple M5 (10 cores), Xcode 26.6, iPhone 17 simulator. Each run used a private copy of the tree.
Runs alternated between the old and new loops. Times are wall-clock means.
A one-file edit means changing a string literal in `ItemsView.body`.

| | Before | After |
|---|---|---|
| 1. Incremental build after a one-file view edit | 1.43–1.76s | 1.18–1.26s |
| 2. Edit → app relaunched (build + install + launch) | ~1.9s | ~1.9s (one command) |
| 3a. Incremental tests after a store edit | 4.7s (`xcodebuild test`, 16 tests) | 1.0s (`dev.sh test`, 16 + 142 tests) |
| 3b. Incremental tests after a view edit | 5.2s | 1.1s |
| 4. Clean build (empty derived data, warm SPM cache) | 7.1s | 6.6s |

Where the time goes in an incremental build (~1.2s): xcodebuild startup ~0.35s, package graph and
build description ~0.45s, Swift driver + compile + emit module ~0.45s, link + sign ~0.1s.
Install + launch adds ~0.45s. Simulator `xcodebuild test` spends ~2s launching the host app.

What helped:
- **Running the store tests on macOS** (`AppLogic/`), which removes the simulator test host.
- `COMPILER_INDEX_STORE_ENABLE=NO` for CLI builds (passed by `dev.sh`, not set in `project.yml`, so
  Xcode keeps indexing): about −0.5s clean, about −0.05s incremental.
- `xcodegen generate --use-cache` regenerates only when `project.yml` or the file list changes.
  This saves ~0.03s and still regenerates when files are added or removed.

Measured and not adopted (all within noise, ±0.1s): `-skipPackageUpdates`,
`-disableAutomaticPackageResolution`, `-onlyUsePackageVersionsFromResolvedFile`,
`-skipMacroValidation`/`-skipPackagePluginValidation`; destination by UDID vs name vs generic;
`ENABLE_DEBUG_DYLIB=NO`; `CODE_SIGNING_ALLOWED=NO`; `EAGER_LINKING=YES`;
`SWIFT_ENABLE_EXPLICIT_MODULES=NO`; `BUILD_ACTIVE_RESOURCES_ONLY=YES`; `ENABLE_TESTABILITY=NO`;
removing the app icon; `-enableCodeCoverage NO`, `-collect-test-diagnostics never`,
`-parallel-testing-enabled NO`; `build-for-testing` + `test-without-building`; and replacing the
SPM packages with vendored static-library targets. That last change saved only ~0.05s incremental
and ~0.5s clean, which did not justify vendoring. Debug defaults were already right:
incremental compilation mode, `-Onone`, `dwarf`, `ONLY_ACTIVE_ARCH`, explicit modules.

Slowest type-checks at the time of measurement, with `-warn-long-expression-type-checking=50`:
`TripsView.body` 306ms, `KitDetailView.content` 106ms, `TripDetailView.body` 101ms.
