import { invoke } from "@tauri-apps/api/core";

export async function readStore(): Promise<string> {
  return invoke<string>("read_store");
}

export async function writeStore(json: string): Promise<void> {
  return invoke("write_store", { json });
}
