import type { Store } from "@turbolists/core/store";
import { emptyStore, loadStore, storeToJson } from "@turbolists/core/store";
import { readStore, writeStore } from "./persist.ts";

let store: Store = emptyStore();
const listeners: Array<() => void> = [];
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export function getStore(): Store {
  return store;
}

export function setStore(next: Store): void {
  store = next;
  for (const fn of listeners) fn();
  scheduleSave();
}

export function subscribe(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function scheduleSave(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    writeStore(storeToJson(store));
  }, 500);
}

export async function initStore(): Promise<void> {
  const raw = await readStore();
  store = loadStore(JSON.parse(raw));
  for (const fn of listeners) fn();
}
