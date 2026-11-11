# Working on Turbolists

This is a Tauri app with a Lit frontend, not a SwiftUI app. Domain logic lives in
`packages/core`; UI and persistence integration live in `packages/app`.

## iOS simulator

Use XcodeBuildMCP to build, launch, inspect, and interact with the installed app.
Project defaults are in `.xcodebuildmcp/config.yaml`.

- Run `deno task setup:ios-testing` once per checkout/toolchain. This compiles the
  WebView accessibility helper in `.xcodebuildmcp/cache/`.
- Keep `PATH="$HOME/.cargo/bin:$PATH" deno task tauri ios dev --open --no-watch`
  running from `packages/app` while building with MCP. It supplies Tauri's build
  bridge and the Vite dev server.
- Read MCP session defaults before building. Use `app_iOS` on an iOS simulator.
  The Xcode build environment must include `cargo` and `deno` on PATH.
- `tools/axe-web` exposes WebView controls to normal MCP tools. Use current
  `elementRef`s from `snapshot_ui`, `wait_for_ui`, or a successful action's
  refreshed snapshot. Refresh after navigation or scrolling; never reuse stale refs.
- Wait for a known control after launch; the webview initially has an empty tree.
  Narrow assertions by role/label if text appears in both a label and a button.
- Run `deno task test:ios` against the installed app for a real MCP smoke test.
  It creates uniquely named test data, checks persistence across an app restart,
  and removes its own data on success. Do not reset the simulator or replace the
  user's store for testing.

## MCP interaction fixes

The frontend is a WKWebView. Its controls live in a separate accessibility
process; the bundled AXe traversal originally returned no actionable web
controls. `tools/axe-web` is the project's adapter, selected by `axePath` in
`.xcodebuildmcp/config.yaml`. Restart MCP after changing its configuration;
do not patch installed npm packages or rely on a live Node inspector override.

- `tools/axe-web.swift` uses FBControlCore's remote-content discovery to include
  WebView controls in native snapshots. The Deno adapter maps headings to text
  and links to buttons so MCP's semantic snapshot format can represent them.
- Setup pins XcodeBuildMCP 2.7.0 and the private idb compile-time headers. Framework
  symlinks and Swift interface compatibility fixes live only in the ignored
  `.xcodebuildmcp/cache/`. Rerun `deno task setup:ios-testing` after changing the
  helper, Xcode, or npm cache location. See `tools/setup-ios-testing.ts`.
- Accessibility can report full DOM bounds for controls clipped by scroll
  areas. The adapter asks native accessibility to scroll tap targets into view
  and refreshes their bounds before sending physical HID input.
- Point lookup alone does **not** reliably detect CSS clipping. Controls behind
  the fixed navigation or Undo bar are filtered out of snapshots so an agent
  must scroll before tapping. A reported offscreen center can otherwise hit a
  bottom tab. If a target is absent, swipe the current scroll reference and
  capture again; do not tap coordinates copied from an older snapshot.
  Require the whole target frame above the fixed controls, not just its center:
  tab-bar padding can cover a center slightly above the tab buttons themselves.
- Native popovers expose a `dismiss popup` button. The adapter restricts its
  originally full-screen frame to an uncovered strip outside the popup. This
  allows normal MCP taps to close the native iOS share sheet.
- Some native share-sheet actions currently appear as text rather than buttons;
  their remote frames can use local coordinates. Do not turn those labels into
  clickable targets without fixing and verifying their coordinate conversion.
  The smoke test asserts `Copy` as **text**, then taps `dismiss popup`.

## UI verification workflow

- Finish frontend edits before starting `deno task test:ios`. Vite HMR resets the
  active screen and can make a good interaction look broken. Keep manual input
  and other simulator automation out of a running smoke test.
- The smoke test launches its own MCP stdio client with `simulator,ui-automation`
  workflows. It covers item creation, facet/item reuse, search, packing, native
  sharing and dismissal, persistence across relaunch, archive/restore, trip
  reuse, reset confirmation, cascading deletion, Undo, and fixture cleanup.
- It opens the share sheet and cancels; do not select recipients or send data
  as part of verification without the user's instruction.
- If a run fails, inspect its unique fixture suffix and current screen. Resume
  or clean up only that run's fixtures through the UI. Do not delete the user's
  lists, reset the simulator, or replace its persistence file to get a clean run.
- Search for a uniquely named fixture before counting its visible rows. Existing
  libraries can exceed the viewport; a missing offscreen target does not imply
  creation failed or produced duplicates.
- Reveal status text before asserting it. Longer checklists can scroll the
  progress card offscreen while testing bottom actions such as Reset. The smoke
  test's `expectText` helper scrolls toward earlier content when needed.
- MCP `type_text` rejects embedded newlines and refocuses its target on each
  call. Use `key_press` (Return = 40) to submit an inline item field.
- For quick layout/behavior checks, use an isolated mobile Playwright WebKit
  context with mocked Tauri `read_store`/`write_store` calls. Use `locator.tap()`
  with touch-enabled WebKit; mouse `click()` can report spurious interception.
  These fixtures must never replace the real simulator's store.
- `deno task test:ui` runs the repeatable WebKit checks for list motion, keyed row
  identity, facet expansion, animated counters, reduced motion, and haptic command
  dispatch. Keep Vite running on port 1420 (or set `TURBOLISTS_UI_URL`). If WebKit
  is missing, install it with `deno run -A npm:playwright-core@1.65.0 install webkit`.

## Motion and haptics

- Keep list entries keyed by domain ID with Lit `repeat`; positional mapping
  reuses the wrong DOM nodes when filtering, removing, or inserting rows.
- `components/list-motion.ts` supplies the existing Lit motion directive for
  layout movement and entry feedback. Avoid scaling text or retaining removed,
  actionable rows as exit-animation ghosts. Within each checklist group, checked
  items move to the bottom with animation; unchecking restores their original
  position among unpacked items. Preserve facet order within each packing state.
  The checkmark and haptic update immediately; wait 80 ms before changing row
  order so the check reads first. Keep this delay local to the UI, cancel its
  timer when leaving the view, and do not delay the store action or persistence.
- `animated-number.ts` supplies packing counters. Reset counters when switching
  trips so values do not animate from a different trip's progress.
- Respect `prefers-reduced-motion` in JavaScript as well as CSS: CSS rules alone
  do not disable Web Animations API animations or requestAnimationFrame counters.
  Browser checks should verify real animation frames, stable row identity, and
  the reduced-motion path, rather than just checking that classes exist.
- Packing haptics are handled centrally by `hapticOnCheck` in `store/process.ts`:
  one native `impactFeedback("light")` per `trip/toggle-checked` action. The Rust
  mobile builder installs the haptics plugin and `capabilities/default.json`
  grants `haptics:default`. Avoid adding a second call in click handlers.
- An isolated browser test can spy on `plugin:haptics|impact_feedback` to verify
  the command/style and count. A simulator cannot confirm the physical feel;
  verify that on a real iPhone before claiming tactile feedback was tested.

Run `deno task test` and `deno task typecheck` for core changes, and
`deno task build` from `packages/app` for frontend changes. Rust persistence tests
run with `cargo test --lib` from `packages/app/src-tauri`.
