import { store } from "./store/index.ts";
import { readStore } from "./persist.ts";
import { loadStore } from "@turbolists/core/store";
import "./components/app-shell.ts";

async function boot() {
  const raw = await readStore();
  const data = loadStore(JSON.parse(raw));
  store.put({ id: "store/loaded", data: { store: data } });
}

boot();
