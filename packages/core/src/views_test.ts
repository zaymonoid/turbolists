import { assertEquals } from "@std/assert";
import * as fc from "fast-check";
import {
  formatTripChecklist,
  itemUsage,
  packProgress,
  tripChecklist,
} from "./views.ts";
import { kitId, itemId, tripId } from "./ids.ts";
import type { Kit } from "./kit.ts";
import type { Trip } from "./trip.ts";
import type { ItemId } from "./ids.ts";

const f1 = kitId("f1");
const f2 = kitId("f2");
const f3 = kitId("f3");
const i1 = itemId("i1");
const i2 = itemId("i2");
const i3 = itemId("i3");
const i4 = itemId("i4");
const i5 = itemId("i5");

const kits: readonly Kit[] = [
  { id: f1, name: "Trad Rack", itemIds: [i1, i2, i3] },
  { id: f2, name: "Camp Kitchen", itemIds: [i3, i4] },
  { id: f3, name: "Sleep System", itemIds: [i5] },
];

const t1 = tripId("t1");

function makeTrip(fIds: typeof f1[], checked: ItemId[] = []): Trip {
  return {
    id: t1,
    name: "Test",
    createdAt: "2025-01-01",
    kitIds: fIds,
    checked: new Set(checked),
  };
}

// tripChecklist tests

Deno.test("tripChecklist - empty kits yields empty checklist", () => {
  assertEquals(tripChecklist(makeTrip([]), kits), []);
});

Deno.test("tripChecklist - single kit returns its items in order", () => {
  assertEquals(tripChecklist(makeTrip([f1]), kits), [i1, i2, i3]);
});

Deno.test("tripChecklist - union of multiple kits deduplicates, preserves sub-order", () => {
  // f1=[i1,i2,i3], f2=[i3,i4] → [i1,i2,i3,i4] (i3 appears once, at f1's position)
  assertEquals(tripChecklist(makeTrip([f1, f2]), kits), [i1, i2, i3, i4]);
});

Deno.test("tripChecklist - all kits", () => {
  assertEquals(
    tripChecklist(makeTrip([f1, f2, f3]), kits),
    [i1, i2, i3, i4, i5],
  );
});

Deno.test("tripChecklist - kit order matters", () => {
  // f2=[i3,i4], f1=[i1,i2,i3] → [i3,i4,i1,i2] (i3 from f2 first)
  assertEquals(tripChecklist(makeTrip([f2, f1]), kits), [i3, i4, i1, i2]);
});

Deno.test("tripChecklist - skips unknown kit ids", () => {
  assertEquals(
    tripChecklist(makeTrip([f1, kitId("deleted")]), kits),
    [i1, i2, i3],
  );
});

Deno.test("tripChecklist - all unknown kits yields empty", () => {
  assertEquals(
    tripChecklist(makeTrip([kitId("d1"), kitId("d2")]), kits),
    [],
  );
});

// packProgress tests

Deno.test("packProgress - nothing checked", () => {
  assertEquals(packProgress(makeTrip([f1]), kits), { checked: 0, total: 3 });
});

Deno.test("packProgress - all checked", () => {
  assertEquals(
    packProgress(makeTrip([f1], [i1, i2, i3]), kits),
    { checked: 3, total: 3 },
  );
});

Deno.test("packProgress - partial checked", () => {
  assertEquals(
    packProgress(makeTrip([f1, f2], [i1, i3]), kits),
    { checked: 2, total: 4 },
  );
});

Deno.test("packProgress - checked items not in checklist are ignored", () => {
  assertEquals(
    packProgress(makeTrip([f3], [i1, i5]), kits),
    { checked: 1, total: 1 },
  );
});

Deno.test("packProgress - empty trip", () => {
  assertEquals(packProgress(makeTrip([]), kits), { checked: 0, total: 0 });
});

Deno.test("packProgress - with deleted kits", () => {
  assertEquals(
    packProgress(makeTrip([f3, kitId("deleted")], [i5]), kits),
    { checked: 1, total: 1 },
  );
});

// itemUsage tests

Deno.test("itemUsage - maps items to their kits", () => {
  const items = [
    { id: i1, name: "A" },
    { id: i2, name: "B" },
    { id: i3, name: "C" },
    { id: i4, name: "D" },
    { id: i5, name: "E" },
  ];
  const usage = itemUsage(items, kits);
  assertEquals(usage.get(i1), new Set([f1]));
  assertEquals(usage.get(i2), new Set([f1]));
  assertEquals(usage.get(i3), new Set([f1, f2]));
  assertEquals(usage.get(i4), new Set([f2]));
  assertEquals(usage.get(i5), new Set([f3]));
});

Deno.test("itemUsage - unreferenced item has empty set", () => {
  const orphan = itemId("i99");
  const usage = itemUsage([{ id: orphan, name: "Orphan" }], kits);
  assertEquals(usage.get(orphan), new Set());
});

Deno.test("itemUsage - empty items", () => {
  assertEquals(itemUsage([], kits).size, 0);
});

Deno.test("itemUsage - empty kits", () => {
  const usage = itemUsage([{ id: i1, name: "A" }], []);
  assertEquals(usage.get(i1), new Set());
});

// Property-based tests

Deno.test("property: checked count never exceeds total", () => {
  fc.assert(
    fc.property(
      fc.subarray([f1, f2, f3]),
      fc.subarray([i1, i2, i3, i4, i5]),
      (fIds, checked) => {
        const trip = makeTrip(fIds, checked);
        const progress = packProgress(trip, kits);
        assertEquals(progress.checked <= progress.total, true);
      },
    ),
  );
});

Deno.test("property: checklist items are subset of all kit items", () => {
  fc.assert(
    fc.property(fc.subarray([f1, f2, f3]), (fIds) => {
      const checklist = tripChecklist(makeTrip(fIds), kits);
      const allItems = new Set<ItemId>();
      for (const f of kits) for (const id of f.itemIds) allItems.add(id);
      for (const id of checklist) assertEquals(allItems.has(id), true);
    }),
  );
});

Deno.test("property: checklist has no duplicates", () => {
  fc.assert(
    fc.property(fc.subarray([f1, f2, f3]), (fIds) => {
      const checklist = tripChecklist(makeTrip(fIds), kits);
      assertEquals(new Set(checklist).size, checklist.length);
    }),
  );
});

Deno.test("property: itemUsage covers every item in every kit", () => {
  const items = [
    { id: i1, name: "A" },
    { id: i2, name: "B" },
    { id: i3, name: "C" },
    { id: i4, name: "D" },
    { id: i5, name: "E" },
  ];
  const usage = itemUsage(items, kits);
  for (const kit of kits) {
    for (const iId of kit.itemIds) {
      assertEquals(usage.get(iId)!.has(kit.id), true);
    }
  }
});

Deno.test("formatTripChecklist preserves progress and first occurrence order across shared kits", () => {
  const trip = makeTrip([f1, f2], [i1, i4, i5]);
  assertEquals(
    formatTripChecklist(trip, kits, [
      { id: i1, name: "Headlamp" },
      { id: i2, name: "Jacket" },
      { id: i3, name: "Water" },
      { id: i4, name: "Stove" },
    ]),
    "Test\n2 of 4 packed\n\n- [x] Headlamp\n- [ ] Jacket\n- [ ] Water\n- [x] Stove",
  );
});

Deno.test("formatTripChecklist skips missing references and indents notes", () => {
  assertEquals(
    formatTripChecklist(makeTrip([f1, f2, f3], [i1, i2]), kits, [
      { id: i1, name: "Warm\n jacket", notes: "Waterproof\nCheck pockets" },
    ]),
    "Test\n1 of 1 packed\n\n- [x] Warm jacket\n    Waterproof\n    Check pockets",
  );
  assertEquals(
    formatTripChecklist(makeTrip([]), kits, []),
    "Test\n0 of 0 packed",
  );
});
