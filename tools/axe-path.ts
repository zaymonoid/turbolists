/** Resolve the pinned MCP package without modifying its signed native artifacts. */
export async function findNativeAxe(): Promise<string> {
  const override = Deno.env.get("TURBOLISTS_NATIVE_AXE");
  if (override) return override;
  const cache = `${
    Deno.env.get("npm_config_cache") ?? `${Deno.env.get("HOME")}/.npm`
  }/_npx`;
  try {
    for await (const entry of Deno.readDir(cache)) {
      const root = `${cache}/${entry.name}/node_modules/xcodebuildmcp`;
      try {
        const manifest = JSON.parse(
          await Deno.readTextFile(`${root}/package.json`),
        );
        if (manifest.version === "2.7.0") {
          await Deno.stat(`${root}/bundled/axe`);
          return `${root}/bundled/axe`;
        }
      } catch { /* Unrelated npx cache entry. */ }
    }
  } catch { /* npx has not populated its cache yet. */ }
  throw new Error(
    "Run deno task setup:ios-testing first, or set TURBOLISTS_NATIVE_AXE to the native AXe binary.",
  );
}
