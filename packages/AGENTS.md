# Tauri/Lit reference implementation

**Reference only.** The product is the SwiftUI app in `swift/` (see the root
`AGENTS.md`). Do not add features or fix bugs here; read this code to check how
the original behaved. The notes below are kept for anyone who needs to run it.

Domain logic lives in `packages/core`; UI and persistence integration live in
`packages/app`. Its Xcode project is `packages/app/src-tauri/gen/apple/app.xcodeproj`,
scheme `app_iOS`, bundle ID `com.turbolists.app`.

## iOS simulator

Its WebView automation tooling (the `tools/axe-web` AXe adapter, its setup task
and the `deno task test:ios` smoke test) was removed. It was last present in
commit `fafa22d` if you need to drive this app through MCP again.

## Motion and haptics

- Keep list entries keyed by domain ID with Lit `repeat`; positional mapping
  reuses the wrong DOM nodes when filtering, removing, or inserting rows.
- `components/list-motion.ts` supplies the existing Lit motion directive for
  layout movement and entry feedback. Avoid scaling text or retaining removed,
  actionable rows as exit-animation ghosts. Within each checklist group, checked
  items move to the bottom with animation; unchecking restores their original
  position among unpacked items. Preserve kit order within each packing state.
  The checkmark and haptic update immediately; wait 80 ms before changing row
  order so the check reads first. Keep this delay local to the UI, cancel its
  timer when leaving the view, and do not delay the store action or persistence.
- Bottom sheets (`<dialog>`) open and close through `presentSheet`/`dismissSheet`
  in `components/sheet.ts`, which add the spring, swipe-down-to-dismiss, and
  backdrop fade (`--sheet-progress`, inherited by `::backdrop`). Do not call
  `showModal()`/`close()` directly. A swipe dismissal fires the dialog's
  `cancel` event, so handle `cancel` by calling `dismissSheet`.
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
