#!/usr/bin/env bash
# Fast build/run/test loop for the SwiftUI app. See swift/README.md.
#
#   ./dev.sh build      regenerate project if needed, build app for the simulator
#   ./dev.sh run        build, install, and relaunch on the simulator
#   ./dev.sh launch     relaunch the last build without building
#   ./dev.sh test       app store tests + core tests on macOS (swift test, parallel)
#   ./dev.sh test-app   app store tests (Turbolists/Tests) on macOS
#   ./dev.sh test-core  TurbolistsCore tests on macOS
#   ./dev.sh test-sim   app tests on the iOS simulator (xcodebuild test)
#   ./dev.sh gen        regenerate Turbolists.xcodeproj (skipped when unchanged)
#
# Env: SIM=<udid|name> (default: booted "iPhone 17 Pro"),
#      DERIVED_DATA=<path> (default: Turbolists/.build/dd), VERBOSE=1.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT/Turbolists"
DD="${DERIVED_DATA:-$APP_DIR/.build/dd}"
BUNDLE_ID="com.turbolists.swiftui"
APP_PATH="$DD/Build/Products/Debug-iphonesimulator/Turbolists.app"

now() { perl -MTime::HiRes=time -e 'printf "%.3f", time'; }
T0=$(now)
TIMES=()
phase_start() { PHASE_T=$(now); }
phase_end() { TIMES+=("$1 $(perl -e "printf '%.2fs', $(now) - $PHASE_T")"); }
summary() {
  local out="" t
  for t in "${TIMES[@]}"; do out+="$t · "; done
  echo "⏱  ${out}total $(perl -e "printf '%.2fs', $(now) - $T0")" >&2
}

sim_udid() {
  local want="${SIM:-iPhone 17 Pro}" booted udid
  if [[ "$want" =~ ^[0-9A-F-]{36}$ ]]; then echo "$want"; return; fi
  booted=$(xcrun simctl list devices booted)
  udid=$(grep -F "    $want (" <<<"$booted" | grep -oE '[0-9A-F-]{36}' | head -1 || true)
  if [[ -z "$udid" ]]; then
    udid=$(xcrun simctl list devices available | grep -F "    $want (" | grep -oE '[0-9A-F-]{36}' | head -1 || true)
    [[ -n "$udid" ]] || { echo "No simulator named '$want'" >&2; exit 1; }
    echo "Booting $want ($udid)…" >&2
    xcrun simctl boot "$udid" >&2
  fi
  echo "$udid"
}

gen() {
  phase_start
  cd "$APP_DIR"
  # --use-cache skips generation unless project.yml or the file list changed.
  if [[ -d Turbolists.xcodeproj ]]; then
    xcodegen generate --quiet --use-cache
  else
    xcodegen generate --quiet
  fi
  phase_end gen
}

# Overrides shared by build and test-sim; keep them identical or each switch
# between the two recompiles. Index store is for the IDE, not CLI builds.
xcb() {
  local action="$1"; shift
  local quiet=(-quiet)
  [[ -n "${VERBOSE:-}" ]] && quiet=()
  xcodebuild -project "$APP_DIR/Turbolists.xcodeproj" -scheme Turbolists \
    -configuration Debug -destination "id=$UDID" -derivedDataPath "$DD" \
    ${quiet[@]+"${quiet[@]}"} COMPILER_INDEX_STORE_ENABLE=NO "$@" "$action"
}

build() {
  gen
  UDID=$(sim_udid)
  phase_start
  xcb build
  phase_end build
}

launch() {
  [[ -n "${UDID:-}" ]] || UDID=$(sim_udid)
  phase_start
  xcrun simctl install "$UDID" "$APP_PATH"
  phase_end install
  phase_start
  xcrun simctl launch --terminate-running-process "$UDID" "$BUNDLE_ID" >/dev/null
  phase_end launch
}

# swift test, printing only failures and the summary unless VERBOSE is set.
spm_test() {
  local dir="$1" name="$2" log
  log=$(mktemp)
  if (cd "$dir" && swift test >"$log" 2>&1); then
    if [[ -n "${VERBOSE:-}" ]]; then cat "$log"; else grep -E '^✔ Test run with' "$log" | sed "s|^|$name: |"; fi
    rm -f "$log"
  else
    if [[ -n "${VERBOSE:-}" ]]; then cat "$log"; else grep -E 'error:|✘|failed' "$log" | head -60; fi
    echo "$name: FAILED (full log: $log)" >&2
    return 1
  fi
}

cmd="${1:-run}"
case "$cmd" in
  gen) gen ;;
  build) build ;;
  run) build; launch ;;
  launch) launch ;;
  test-core) phase_start; spm_test "$ROOT/TurbolistsCore" core; phase_end test-core ;;
  test-app) phase_start; spm_test "$ROOT/AppLogic" app; phase_end test-app ;;
  test)
    phase_start
    spm_test "$ROOT/AppLogic" app & app=$!
    spm_test "$ROOT/TurbolistsCore" core & core=$!
    status=0
    wait $app || status=1
    wait $core || status=1
    phase_end test
    [[ $status -eq 0 ]] || { summary; exit 1; }
    ;;
  test-sim)
    gen
    UDID=$(sim_udid)
    phase_start
    xcb test
    phase_end test-sim
    ;;
  -h|--help|help) sed -n '2,15p' "$0"; exit 0 ;;
  *) echo "Unknown command: $cmd (try ./dev.sh help)" >&2; exit 2 ;;
esac
summary
