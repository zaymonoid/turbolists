import { store } from "./store/index.ts";
import { readStore, writeStore } from "./persist.ts";
import { loadStore, storeToJson } from "@turbolists/core/store";
import "./components/app-shell.ts";

async function boot() {
  try {
    const raw = await readStore();
    const data = loadStore(JSON.parse(raw));
    store.put({ id: "store/loaded", data: { store: data } });
  } catch (error) {
    console.error("Could not load packing lists", error);
    store.put({ id: "store/load-failed", data: {} });
  }
}

document.addEventListener("app-retry-load", boot);
boot();

// iOS can suspend the webview before the debounce timer runs.
document.addEventListener("visibilitychange", () => {
  const state = store.getState();
  if (document.visibilityState !== "hidden" || state.loadStatus !== "ready") {
    return;
  }
  writeStore(storeToJson(state.data)).then(
    () => store.put({ id: "store/save-status", data: { status: "saved" } }),
    () => store.put({ id: "store/save-status", data: { status: "error" } }),
  );
});
