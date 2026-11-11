import { invoke, isTauri } from "@tauri-apps/api/core";

/** Resolves when the sheet opens, not when a recipient receives anything. */
export async function shareChecklist(
  title: string,
  text: string,
): Promise<"opened" | "copied" | "cancelled"> {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isTauri() && ios) {
    await invoke("share_checklist", { text });
    return "opened";
  }
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "opened";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      throw error;
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
