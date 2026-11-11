import { invoke } from "@tauri-apps/api/core";

export async function readStore(): Promise<string> {
  return invoke<string>("read_store");
}

// An in-flight invoke cannot be cancelled. Keep writes in order even when a
// debounced save is interrupted by another edit or a background flush.
let writes: Promise<void> = Promise.resolve();
export function writeStore(json: string): Promise<void> {
  const next = writes.catch(() => {}).then(() =>
    invoke<void>("write_store", { json })
  );
  writes = next;
  return next;
}
