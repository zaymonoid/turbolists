/** Run against the installed app through MCP, including its real Rust persistence. */
import { Client } from "npm:@modelcontextprotocol/sdk@1.32.2/client/index.js";
import { StdioClientTransport } from "npm:@modelcontextprotocol/sdk@1.32.2/client/stdio.js";

const root = decodeURIComponent(new URL("../", import.meta.url).pathname);
const client = new Client({ name: "turbolists-ios-smoke", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: "npx",
  args: ["--yes", "xcodebuildmcp@2.7.0", "mcp"],
  cwd: root,
  stderr: "pipe",
  env: {
    ...Deno.env.toObject(),
    XCODEBUILDMCP_ENABLED_WORKFLOWS: "simulator,ui-automation",
    XCODEBUILDMCP_SENTRY_DISABLED: "true",
  },
});
interface Snapshot {
  targets: string[];
  text?: string[];
  scroll?: string[];
}
let screen: Snapshot;
async function call(name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args }, undefined, {
    timeout: 60_000,
  });
  const payload = result.structuredContent as {
    didError?: boolean;
    error?: string;
    data?: { capture?: Snapshot };
  } | undefined;
  if (result.isError || payload?.didError) {
    throw new Error(`${name}: ${JSON.stringify(result)}`);
  }
  if (payload?.data?.capture?.targets) screen = payload.data.capture;
  return payload;
}
async function snapshot() {
  await call("snapshot_ui");
  return screen;
}
function targets() {
  return (screen?.targets ?? []).map((row) => {
    const [ref, action, role, label, value] = row.split("|");
    return { ref, action, role, label, value };
  });
}
async function tap(label: string, last = false) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await snapshot();
    const matches = targets().filter((t) =>
      t.action === "tap" && t.label === label
    );
    const target = last ? matches.at(-1) : matches[0];
    if (target) {
      await call("tap", { elementRef: target.ref });
      return;
    }
    const scroll = screen.scroll?.[0]?.split("|")[0];
    if (!scroll || attempt === 3) break;
    await call("swipe", {
      withinElementRef: scroll,
      direction: "up",
      distance: 0.6,
    });
  }
  throw new Error(`Missing button: ${label}\n${JSON.stringify(screen)}`);
}
async function type(label: string, text: string, replaceExisting = true) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await snapshot();
    const target = targets().find((t) =>
      t.role === "text-field" && t.label === label
    );
    if (target) {
      await call("type_text", {
        elementRef: target.ref,
        text,
        replaceExisting,
      });
      return;
    }
    const scroll = screen.scroll?.[0]?.split("|")[0];
    if (!scroll || attempt === 3) break;
    await call("swipe", {
      withinElementRef: scroll,
      direction: "down",
      distance: 0.6,
    });
  }
  throw new Error(`Missing field: ${label}\n${JSON.stringify(screen)}`);
}
async function expectText(text: string) {
  // Status text near the top can scroll out of view while exercising controls
  // at the bottom of a longer checklist. Reveal it before asserting it.
  for (let attempt = 0; attempt < 4; attempt++) {
    await snapshot();
    if (
      screen.text?.some((row) =>
        row.split("|").slice(3, 5).some((value) => value.includes(text))
      )
    ) break;
    const scroll = screen.scroll?.[0]?.split("|")[0];
    if (!scroll || attempt === 3) break;
    await call("swipe", {
      withinElementRef: scroll,
      direction: "down",
      distance: 0.6,
    });
  }
  await call("wait_for_ui", {
    predicate: "textContains",
    role: "text",
    text,
    timeoutMs: 15_000,
  });
}
async function dismissKeyboard() {
  await snapshot();
  if (targets().some((t) => t.label === "Done" && t.action === "tap")) {
    await tap("Done");
  }
}
const suffix = Date.now().toString(36);
const trip = `MCP trip ${suffix}`;
const repeatTrip = `MCP repeat ${suffix}`;
const kit = `MCP kit ${suffix}`;
const item = `mcp item ${suffix}`;
console.log(`iOS smoke test fixture suffix: ${suffix}`);

try {
  await client.connect(transport);
  await call("session_show_defaults");
  await call("launch_app_sim");
  await call("wait_for_ui", {
    predicate: "exists",
    label: "New trip",
    role: "button",
    timeoutMs: 15000,
  });
  await tap("Items", true);
  await tap("New item");
  await type("e.g. Phone charger", item);
  await tap("Add");
  // Existing libraries can be longer than the viewport. Locate our fixture
  // before counting it; an offscreen row is not evidence of a duplicate.
  await type("Search items", item);
  await dismissKeyboard();
  await snapshot();
  if (
    targets().filter((target) => target.label === `Rename ${item}`).length !== 1
  ) {
    throw new Error(
      `Expected one created fixture row: ${JSON.stringify(screen)}`,
    );
  }
  console.log("PASS: create a library item through the single-item flow");

  await tap("Kits", true);
  await tap("New kit");
  await type("e.g. Essentials", kit);
  await tap("Add");
  await type(`Add item to ${kit}`, item);
  await call("key_press", { keyCode: 40 });
  await dismissKeyboard();
  // A new kit opens on its own screen; its items are plain rows.
  await expectText(item);
  await tap("Kits");
  await type("Search kits", `missing-${suffix}`);
  await dismissKeyboard();
  await expectText("No kits found");
  await type("Search kits", item);
  await dismissKeyboard();
  await snapshot();
  // The kit row previews its items, so a contained item finds the kit.
  if (!targets().some((t) => t.label.startsWith(kit))) {
    throw new Error(`Kit not found by its item: ${JSON.stringify(screen)}`);
  }
  console.log("PASS: create kit/item and search kits by contained items");

  await tap("Trips", true);
  // A previously selected trip can survive tab changes.
  await snapshot();
  if (!targets().some((t) => t.label === "New trip")) await tap("Trips");
  await tap("New trip");
  await type("e.g. Weekend on the coast", trip);
  await tap("Create");
  // New trips open the kit setup sheet before the checklist.
  await tap(`＋ ${kit}`);
  await tap("Done");
  await type("Search checklist", `missing-${suffix}`);
  await dismissKeyboard();
  await expectText("No matching items");
  await type("Search checklist", item);
  await dismissKeyboard();
  await tap(item);
  await expectText("All packed. Have a great trip!");
  console.log("PASS: compose and complete packing checklist");

  await tap("Share checklist");
  await call("wait_for_ui", {
    predicate: "textContains",
    text: "Copy",
    role: "text",
    timeoutMs: 15000,
  });
  await tap("dismiss popup");
  await expectText("All packed. Have a great trip!");
  console.log(
    "PASS: native iOS share sheet opens and cancels without changing packing progress",
  );

  await call("stop_app_sim");
  await call("launch_app_sim");
  await call("wait_for_ui", {
    predicate: "exists",
    label: `Open ${trip}`,
    role: "button",
    timeoutMs: 15000,
  });
  await tap(`Open ${trip}`);
  await expectText("All packed. Have a great trip!");
  console.log("PASS: packing progress survives a full app restart");

  await tap("Trips");
  await tap(`Archive ${trip}`);
  await call("stop_app_sim");
  await call("launch_app_sim");
  await call("wait_for_ui", {
    predicate: "exists",
    role: "button",
    label: "New trip",
    timeoutMs: 15000,
  });
  await tap("Archived trips");
  await tap(`Open ${trip}`);
  await expectText("Archived trip");
  await expectText("All packed. Have a great trip!");
  await tap("Restore trip");
  await tap("Trips");
  console.log(
    "PASS: archive persists across relaunch and restores with progress intact",
  );
  await type("Search trips", `missing-${suffix}`);
  await dismissKeyboard();
  await expectText("No trips found");
  await type("Search trips", trip);
  await dismissKeyboard();
  await tap(`Pack ${trip} again`);
  await type("Name", repeatTrip);
  await tap("Create trip");
  await expectText("1 item left to pack");
  await tap(item);
  await expectText("All packed. Have a great trip!");
  await tap("Trips");
  await tap(`Delete ${repeatTrip}`);
  await tap("Delete");
  await tap(`Open ${trip}`);
  await expectText("All packed. Have a great trip!");
  console.log(
    "PASS: trip/checklist search and repeat trip with independent progress",
  );

  await tap("Reset packing progress");
  await tap("Cancel");
  await expectText("All packed. Have a great trip!");
  await tap("Reset packing progress");
  await tap("Reset");
  await expectText("1 item left to pack");
  await tap("Undo");
  await expectText("All packed. Have a great trip!");
  await tap("Items", true);
  await tap(`Delete ${item}`);
  await tap("Delete");
  await tap("Trips", true);
  await tap("Undo");
  await expectText("All packed. Have a great trip!");
  console.log(
    "PASS: reset and cascading item deletion can be undone across tabs",
  );

  await tap("Trips");
  await tap(`Delete ${trip}`);
  await tap("Delete");
  await tap("Kits", true);
  // Deleting happens on the kit's own screen.
  await snapshot();
  const kitButton = targets().find((t) => t.label.startsWith(kit));
  if (!kitButton) throw new Error(`Missing created kit: ${kit}`);
  await call("tap", { elementRef: kitButton.ref });
  await tap(`Delete ${kit}`);
  await tap("Delete");
  await tap("Items", true);
  await tap(`Delete ${item}`);
  await tap("Delete");
  await tap("Dismiss undo");
  await tap("Trips", true);
  console.log("PASS: clean up smoke-test data; existing data retained");
} catch (error) {
  console.error(`iOS smoke test failed. Test data uses suffix ${suffix}.`);
  console.error(error);
  Deno.exitCode = 1;
} finally {
  await client.close();
}
