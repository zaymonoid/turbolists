/// <reference lib="dom" />
/** Isolated browser fixtures; never reads or writes the simulator's data. */
import { webkit } from "npm:playwright-core@1.65.0";
const browser = await webkit.launch();
try {
  for (const reduced of [false, true]) {
    const page = await browser.newPage({
      viewport: { width: 393, height: 852 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      (window as any).__motions = [];
      (window as any).__haptics = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames: any, options: any) {
        (window as any).__motions.push({ text: this.textContent, frames });
        return animate.call(this, frames, options);
      };
      (window as any).__TAURI_INTERNALS__ = {
        invoke: async (cmd: string, args: any) => {
          if (cmd === "read_store") {
            return JSON.stringify({
              items: [{ id: "a", name: "Jacket" }, { id: "b", name: "Water" }, {
                id: "c",
                name: "Charger",
              }],
              kits: [{
                id: "essentials",
                name: "Essentials",
                itemIds: ["a", "b", "c"],
              }, { id: "extra", name: "Extra", itemIds: [] }],
              trips: [{
                id: "t",
                name: "Weekend",
                createdAt: "2026-11-10",
                kitIds: ["essentials"],
                checked: [],
              }],
            });
          }
          if (cmd === "plugin:haptics|impact_feedback") {
            (window as any).__haptics.push(args.style);
          }
        },
        metadata: { currentWindow: { label: "main" } },
      };
    });
    await page.goto(
      Deno.env.get("TURBOLISTS_UI_URL") ?? "http://127.0.0.1:1420",
    );
    await page.getByRole("button", { name: "Items", exact: true }).tap();
    await page.getByRole("button", { name: "Rename Water", exact: true })
      .waitFor();
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      (window as any).__motions = [];
      (window as any).__water = document.querySelector("app-shell")!.shadowRoot!
        .querySelector("items-view")!.shadowRoot!.querySelector(
          '[data-item-id="b"]',
        );
    });
    await page.getByRole("searchbox", { name: "Search items", exact: true })
      .fill("Water");
    await page.screenshot();
    await page.waitForTimeout(500);
    const observed = await page.evaluate(() => ({
      same: (window as any).__water ===
        document.querySelector("app-shell")!.shadowRoot!.querySelector(
          "items-view",
        )!.shadowRoot!.querySelector('[data-item-id="b"]'),
      motions: (window as any).__motions,
    }));
    if (!observed.same) throw new Error("Item identity changed during filter");
    if (
      !reduced &&
      !observed.motions.some((m: any) =>
        m.frames.some((f: any) => f.transform?.includes("translateY"))
      )
    ) throw new Error("Missing list movement");
    if (reduced && observed.motions.length) {
      throw new Error("Animations ignore reduced motion");
    }
    await page.getByRole("button", { name: "Kits", exact: true }).tap();
    await page.waitForTimeout(350);
    await page.evaluate(() => (window as any).__motions = []);
    await page.getByRole("button", { name: /^Essentials 3 items/ }).tap();
    await page.screenshot();
    await page.waitForTimeout(500);
    if (
      !reduced &&
      !await page.evaluate(() =>
        (window as any).__motions.some((m: any) =>
          m.text.includes("Extra") &&
          m.frames.some((f: any) => f.transform?.includes("translateY"))
        )
      )
    ) throw new Error("Missing kit layout movement");
    await page.getByRole("button", { name: "Trips", exact: true }).tap();
    await page.getByRole("button", { name: "Open Weekend", exact: true }).tap();
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      (window as any).__motions = [];
      (window as any).__packingWater = document.querySelector("app-shell")!
        .shadowRoot!
        .querySelector("trips-view")!.shadowRoot!.querySelector(
          '[aria-label="Water"]',
        );
      (window as any).__packingWater.addEventListener("click", () => {
        setTimeout(() => {
          const row = (window as any).__packingWater;
          (window as any).__beforeReorder = {
            checked: row.getAttribute("aria-checked"),
            order: [...row.parentElement.querySelectorAll('[role="checkbox"]')]
              .map((element: any) => element.getAttribute("aria-label")),
          };
        }, 20);
      }, { once: true });
    });
    await page.getByRole("checkbox", { name: "Water", exact: true }).tap();
    await page.waitForFunction(() => (window as any).__haptics.length === 1);
    await page.waitForTimeout(200);
    const beforeReorder = await page.evaluate(() =>
      (window as any).__beforeReorder
    );
    if (
      beforeReorder.checked !== "true" ||
      beforeReorder.order.join(",") !== "Jacket,Water,Charger"
    ) {
      throw new Error(
        `Check did not precede reorder: ${JSON.stringify(beforeReorder)}`,
      );
    }
    await page.locator("trips-view .counter").getByText("1", { exact: false })
      .waitFor();
    const packedOrder = await page.getByRole("checkbox").allTextContents();
    if (
      packedOrder.map((name) => name.trim()).join(",") !==
        "Jacket,Charger,Water"
    ) {
      throw new Error(
        `Checked item did not move to the bottom: ${packedOrder}`,
      );
    }
    const packingMotion = await page.evaluate(() => ({
      same: (window as any).__packingWater ===
        document.querySelector("app-shell")!.shadowRoot!
          .querySelector("trips-view")!.shadowRoot!.querySelector(
            '[aria-label="Water"]',
          ),
      moved: (window as any).__motions.some((motion: any) =>
        motion.text.includes("Water") &&
        motion.frames.some((frame: any) =>
          frame.transform?.includes("translateY")
        )
      ),
    }));
    if (
      !packingMotion.same || (!reduced && !packingMotion.moved) ||
      (reduced && packingMotion.moved)
    ) {
      throw new Error(
        `Packing row identity/motion failed: ${JSON.stringify(packingMotion)}`,
      );
    }
    await page.getByRole("checkbox", { name: "Water", exact: true }).tap();
    await page.waitForFunction(() => (window as any).__haptics.length === 2);
    await page.waitForFunction(() =>
      [...document.querySelector("app-shell")!.shadowRoot!
        .querySelector("trips-view")!.shadowRoot!.querySelectorAll(
          '[role="checkbox"]',
        )]
        .map((row) => row.getAttribute("aria-label")).join(",") ===
        "Jacket,Water,Charger"
    );
    const unpackedOrder = await page.getByRole("checkbox").allTextContents();
    if (
      unpackedOrder.map((name) => name.trim()).join(",") !==
        "Jacket,Water,Charger"
    ) {
      throw new Error(
        `Unchecked item did not return to its original position: ${unpackedOrder}`,
      );
    }
    const styles = await page.evaluate(() => (window as any).__haptics);
    if (styles.join(",") !== "light,light") {
      throw new Error("Wrong haptics: " + styles);
    }
    if (errors.length) throw new Error(errors.join("\n"));
    console.log(
      `PASS: ${
        reduced ? "reduced" : "normal"
      } motion, keyed list identity, kit layout, packing counters, and one haptic per toggle`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
