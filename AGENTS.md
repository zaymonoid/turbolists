# Working on Kitbag

## Rapid prototyping imperative

We are RAPID prototyping:

- No backwards compatibility
- Move fast and break things
- No app data is sacred
- Velocity and continuous improvement and iteration are paramount

Use Conventional Commits for all commit messages (for example, `feat: add trip reuse`
or `fix: preserve kit order`).

## The app is SwiftUI

Kitbag is a native SwiftUI iOS app in `swift/`. All new work goes there.

The original Tauri/Lit app in `packages/` is kept **for reference only**: read it
to check how something used to behave, but do not add features or fix bugs there,
and do not keep the two in sync. Notes for running the old app are in
`packages/AGENTS.md`.

- `swift/KitbagCore/`: Swift package with the pure domain logic (items, kits,
  trips, `Library`, checklist/progress helpers) and its tests. Free functions that
  `throw InvariantViolation`.
- `swift/Kitbag/`: the iOS app. XcodeGen `project.yml` (the `.xcodeproj` is
  generated and ignored), bundle ID `com.kitbag.swiftui`, iOS 26+, Swift 6.
  - `Sources/Store/`: `AppModel`, `AppAction`, `AppEnvironment`, persistence, built
    on [ObservableStore](https://github.com/subconsciousnetwork/ObservableStore)
    with Combine effects.
  - `Sources/Views/`: `Shell/`, `Trips/`, `Kits/`, `Items/`, and `Shared/`
    (`Theme.swift` holds the palette, type, cards, chips and other shared pieces).
- `swift/AppLogic/`: macOS-only package that symlinks `Sources/Store` and `Tests`
  so the store tests run with `swift test`, without the simulator.

## Build, run, test

Use `swift/dev.sh` (details and timings in `swift/README.md`):

- `./dev.sh run`: build, install and relaunch on the simulator (~2 s incremental).
- `./dev.sh test`: core and store tests on macOS (~1 s). Use this while iterating.
- `./dev.sh test-sim`: app tests on the iOS simulator. Run before handing off.
- `SIM=<name|udid>` picks the simulator (default `iPhone 17 Pro`). When several
  agents work at once, give each its own simulator and `DERIVED_DATA` path, and
  keep all simulator activity (installs, launches, tests) on your own device.

New source files are picked up automatically; `dev.sh` regenerates the project
when the file list or `project.yml` changes.

## Store

- All persistent changes go through `store.send(action)`; `AppModel.update` is the
  only place state changes. Transient UI state (search text, sheets, filters)
  stays in `@State`.
- `withAnimation { store.send(...) }` does **not** animate: ObservableStore applies
  an empty transaction. Animate with `.animation(_:value:)` on the views.
- `Sources/Store/` must import only Foundation, Combine, OSLog, ObservableStore and
  KitbagCore. Importing SwiftUI or UIKit there breaks `dev.sh test` on macOS.
- Saves are debounced 500 ms and run on one serial queue so they land in order.
  Nothing is written before loading has finished, and a failed load never
  overwrites the file. The JSON format matches the old app's `store.json`.
- Destructive actions set `undo` (a snapshot plus a message); any later data edit
  clears it. Send a pending edit (for example an uncommitted rename) *before* the
  destructive action, or it will clear the Undo banner.

## UI

- Native idioms first: `NavigationStack`, `.searchable`, swipe actions, context
  menus, `.sheet` with detents, `.confirmationDialog`, `ShareLink`. System chrome
  (tab bar, toolbars, alerts, sheets) stays Liquid Glass; do not paint over it.
- The app's identity comes from `Theme.swift`: the moss palette (dark) and warm
  paper (light), softened blue for actions, moss green for "all packed", rounded
  tabular digits for counters. Add colours and shared components there, not inline.
- Keep lists keyed by domain ID.
- The trip checklist is a custom `ScrollView` of cards, not a `List`: the stock
  move animation made the card edge dip and rows overlap. Packing a row moves it to
  the bottom of its group straight away with the system `.default` animation (none
  with Reduce Motion); unchecking restores kit order. No custom delays or springs.
  Each row is `.drawingGroup()`ed so it moves as one piece; keep animations inside a
  row scoped (`.animation(_:body:)`) so they don't hijack its position.
- Haptics: one light impact per packing toggle and a success haptic when the last
  item is packed, via `.sensoryFeedback` in the views. Do not add others. A
  simulator cannot confirm the feel; check on a real iPhone before claiming it.
- Respect Reduce Motion (`accessibilityReduceMotion`), Dynamic Type, and both
  colour schemes in every screen. Keep clear accessibility labels on controls:
  the app is verified through the accessibility tree.
- Name fields are capped at 120 characters (`String.capped`).

## Simulator verification

Use MobileBuildMCP (formerly XcodeBuildMCP), pinned to `mobilebuildmcp@2.7.1`
with the `simulator` and `ui-automation` workflows. Project defaults are in
`.mobilebuildmcp/config.yaml`. It drives the simulator with its bundled AXe; no
setup step is needed. The same tools are available from the shell as
`npx -y mobilebuildmcp@2.7.1 ui-automation <tool> --simulator-id <udid>`.

- Keep round trips down: tap and type actions return a compact snapshot, so
  read that instead of calling `snapshot_ui` again; use `batch` for several taps
  on one screen; use `wait_for_ui` instead of sleeping; pass `sinceScreenHash`
  to skip a snapshot when nothing changed. Prefer snapshots to screenshots
  except for visual checks.
- Use current `elementRef`s; refresh the snapshot after navigation, scrolling or
  sheet changes.
- Row actions (delete, archive, rename, pack again) are swipe actions and context
  menus: `long_press` the row, then tap the menu item. The kit item list is
  always in edit mode, so the system grip drags immediately; that turns swipe
  actions off, so kit items are removed from the context menu.
- What AXe sees is not exactly what VoiceOver reads. AXe lists the children of
  combined and `accessibilityHidden` views, and it does not report traits. Put
  state that matters (packed, in this trip) in `accessibilityValue`, not only
  in a trait. Children of List rows inherit the row's swipe actions, so
  MobileBuildMCP lists their text as extra tap targets; tap the row itself.
- Each row action should appear once in VoiceOver's Actions: swipe actions
  already count, so add `.accessibilityAction` only for context-menu-only
  actions such as Rename.
- `type_text` rejects newlines; submit with `key_press` (Return = 40).
- Look at screenshots, in light and dark, before calling visual work done.
- The simulator may also hold the old app (`com.turbolists.app`) with real data.
  Never reset or erase the simulator or touch that app. Create and clean up your
  own test data through the UI.
- There is no end-to-end smoke test for the SwiftUI app yet.
