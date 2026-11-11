import { findNativeAxe } from "./axe-path.ts";

const root = decodeURIComponent(new URL("../", import.meta.url).pathname)
  .replace(/\/$/, "");
const cache = `${root}/.xcodebuildmcp/cache`;
async function run(command: string, args: string[]) {
  const result = await new Deno.Command(command, {
    args,
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  if (!result.success) throw new Error(`${command} failed (${result.code})`);
}
try {
  await findNativeAxe();
} catch {
  await run("npx", ["--yes", "xcodebuildmcp@2.7.0", "--version"]);
}
const binary = await findNativeAxe();
const frameworks = `${binary.slice(0, binary.lastIndexOf("/"))}/Frameworks`;
await Deno.mkdir(`${cache}/Frameworks`, { recursive: true });
// npm strips framework root symlinks. Restore them in a local build directory;
// signed binaries and installed package files are never changed.
for (
  const name of [
    "FBControlCore",
    "FBSimulatorControl",
    "FBDeviceControl",
    "XCTestBootstrap",
  ]
) {
  const local = `${cache}/Frameworks/${name}.framework`;
  const source = `${frameworks}/${name}.framework/Versions/A`;
  await Deno.mkdir(local, { recursive: true });
  for (const entry of ["Headers", "Resources", name, "Versions"]) {
    try {
      await Deno.lstat(`${local}/${entry}`);
    } catch {
      await Deno.symlink(
        entry === "Versions"
          ? `${frameworks}/${name}.framework/Versions`
          : `${source}/${entry}`,
        `${local}/${entry}`,
      );
    }
  }
  const modules = `${local}/Modules`;
  try {
    await Deno.remove(modules, { recursive: true });
  } catch { /* First build. */ }
  await run("cp", ["-R", `${source}/Modules`, modules]);
  if (name === "FBSimulatorControl") {
    for await (const entry of Deno.readDir(`${modules}/${name}.swiftmodule`)) {
      if (!entry.name.endsWith(".swiftinterface")) continue;
      const path = `${modules}/${name}.swiftmodule/${entry.name}`;
      // Swift 6.3 textual interfaces ambiguously qualify modules that have a
      // class with the same name. Unqualify only the cached compiler inputs.
      const text = await Deno.readTextFile(path);
      await Deno.writeTextFile(
        path,
        text.replaceAll("FBSimulatorControl.", "").replaceAll(
          "IOSurface.IOSurface",
          "IOSurface",
        ),
      );
    }
  }
}
const revision = "604c51013438f0c3603b720a05a44b7c5b8f286d";
const headers = `${cache}/idb/PrivateHeaders`;
try {
  await Deno.stat(`${headers}/CoreSimulator/module.modulemap`);
} catch {
  await run("curl", [
    "-fsSL",
    `https://codeload.github.com/cameroncooke/idb/tar.gz/${revision}`,
    "-o",
    `${cache}/idb.tar.gz`,
  ]);
  await Deno.mkdir(`${cache}/idb`, { recursive: true });
  await run("tar", [
    "-xzf",
    `${cache}/idb.tar.gz`,
    "-C",
    `${cache}/idb`,
    "--strip-components=1",
    `idb-${revision}/PrivateHeaders`,
  ]);
}
const include = ["-I", headers];
for await (const entry of Deno.readDir(headers)) {
  if (entry.isDirectory) include.push("-I", `${headers}/${entry.name}`);
}
await run("xcrun", [
  "swiftc",
  "-parse-as-library",
  "tools/axe-web.swift",
  "-F",
  `${cache}/Frameworks`,
  ...include,
  "-framework",
  "FBControlCore",
  "-framework",
  "FBSimulatorControl",
  "-Xlinker",
  "-rpath",
  "-Xlinker",
  frameworks,
  "-o",
  `${cache}/axe-web-native`,
]);
console.log(
  "Simulator accessibility helper ready. MCP snapshots can now see WKWebView controls.",
);
