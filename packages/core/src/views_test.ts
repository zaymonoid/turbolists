import { assertEquals } from "@std/assert";
import * as fc from "fast-check";
import { itemUsage, packProgress, tripChecklist } from "./views.ts";
import type { Facet } from "./facet.ts";
import type { Trip } from "./trip.ts";

const facets: readonly Facet[] = [
  { id: "f1", name: "Trad Rack", itemIds: new Set(["i1", "i2", "i3"]) },
  { id: "f2", name: "Camp Kitchen", itemIds: new Set(["i3", "i4"]) },
  { id: "f3", name: "Sleep System", itemIds: new Set(["i5"]) },
];

function makeTrip(
  facetIds: string[],
  checked: string[] = [],
): Trip {
  return {
    id: "t1",
    name: "Test",
    createdAt: "2025-01-01",
    facetIds: new Set(facetIds),
    checked: new Set(checked),
  };
}

// tripChecklist tests

Deno.test("tripChecklist - empty facets yields empty checklist", () => {
  const trip = makeTrip([]);
  const checklist = tripChecklist(trip, facets);
  assertEquals(checklist.size, 0);
});

Deno.test("tripChecklist - single facet returns its items", () => {
  const trip = makeTrip(["f1"]);
  const checklist = tripChecklist(trip, facets);
  assertEquals(checklist, new Set(["i1", "i2", "i3"]));
});

Deno.test("tripChecklist - union of multiple facets deduplicates", () => {
  const trip = makeTrip(["f1", "f2"]);
  const checklist = tripChecklist(trip, facets);
  // f1 has i1,i2,i3 and f2 has i3,i4 — union is i1,i2,i3,i4
  assertEquals(checklist, new Set(["i1", "i2", "i3", "i4"]));
});

Deno.test("tripChecklist - all facets", () => {
  const trip = makeTrip(["f1", "f2", "f3"]);
  const checklist = tripChecklist(trip, facets);
  assertEquals(checklist, new Set(["i1", "i2", "i3", "i4", "i5"]));
});

Deno.test("tripChecklist - skips unknown facet ids", () => {
  const trip = makeTrip(["f1", "deleted-facet"]);
  const checklist = tripChecklist(trip, facets);
  assertEquals(checklist, new Set(["i1", "i2", "i3"]));
});

Deno.test("tripChecklist - all unknown facets yields empty", () => {
  const trip = makeTrip(["deleted1", "deleted2"]);
  const checklist = tripChecklist(trip, facets);
  assertEquals(checklist.size, 0);
});

// packProgress tests

Deno.test("packProgress - nothing checked", () => {
  const trip = makeTrip(["f1"]);
  const progress = packProgress(trip, facets);
  assertEquals(progress, { checked: 0, total: 3 });
});

Deno.test("packProgress - all checked", () => {
  const trip = makeTrip(["f1"], ["i1", "i2", "i3"]);
  const progress = packProgress(trip, facets);
  assertEquals(progress, { checked: 3, total: 3 });
});

Deno.test("packProgress - partial checked", () => {
  const trip = makeTrip(["f1", "f2"], ["i1", "i3"]);
  const progress = packProgress(trip, facets);
  // checklist is i1,i2,i3,i4. checked i1,i3 are in checklist = 2
  assertEquals(progress, { checked: 2, total: 4 });
});

Deno.test("packProgress - checked items not in checklist are ignored", () => {
  const trip = makeTrip(["f3"], ["i1", "i5"]);
  const progress = packProgress(trip, facets);
  // checklist is just i5. only i5 is in checked ∩ checklist
  assertEquals(progress, { checked: 1, total: 1 });
});

Deno.test("packProgress - empty trip", () => {
  const trip = makeTrip([]);
  const progress = packProgress(trip, facets);
  assertEquals(progress, { checked: 0, total: 0 });
});

Deno.test("packProgress - with deleted facets", () => {
  const trip = makeTrip(["f3", "deleted"], ["i5"]);
  const progress = packProgress(trip, facets);
  assertEquals(progress, { checked: 1, total: 1 });
});

// itemUsage tests

Deno.test("itemUsage - maps items to their facets", () => {
  const items = [
    { id: "i1", name: "A" },
    { id: "i2", name: "B" },
    { id: "i3", name: "C" },
    { id: "i4", name: "D" },
    { id: "i5", name: "E" },
  ];
  const usage = itemUsage(items, facets);

  assertEquals(usage.get("i1"), new Set(["f1"]));
  assertEquals(usage.get("i2"), new Set(["f1"]));
  assertEquals(usage.get("i3"), new Set(["f1", "f2"])); // shared item
  assertEquals(usage.get("i4"), new Set(["f2"]));
  assertEquals(usage.get("i5"), new Set(["f3"]));
});

Deno.test("itemUsage - unreferenced item has empty set", () => {
  const items = [{ id: "i99", name: "Orphan" }];
  const usage = itemUsage(items, facets);
  assertEquals(usage.get("i99"), new Set());
});

Deno.test("itemUsage - empty items", () => {
  const usage = itemUsage([], facets);
  assertEquals(usage.size, 0);
});

Deno.test("itemUsage - empty facets", () => {
  const items = [{ id: "i1", name: "A" }];
  const usage = itemUsage(items, []);
  assertEquals(usage.get("i1"), new Set());
});

// Property-based tests

Deno.test("property: checked count never exceeds total", () => {
  fc.assert(
    fc.property(
      fc.subarray(["f1", "f2", "f3"]),
      fc.subarray(["i1", "i2", "i3", "i4", "i5"]),
      (facetIds, checked) => {
        const trip = makeTrip(facetIds, checked);
        const progress = packProgress(trip, facets);
        assertEquals(progress.checked <= progress.total, true);
      },
    ),
  );
});

Deno.test("property: checklist is subset-or-equal to all items across facets", () => {
  fc.assert(
    fc.property(
      fc.subarray(["f1", "f2", "f3"]),
      (facetIds) => {
        const trip = makeTrip(facetIds);
        const checklist = tripChecklist(trip, facets);
        const allItems = new Set<string>();
        for (const f of facets) {
          for (const id of f.itemIds) allItems.add(id);
        }
        for (const id of checklist) {
          assertEquals(allItems.has(id), true);
        }
      },
    ),
  );
});

Deno.test("property: itemUsage covers every item in every facet", () => {
  const items = [
    { id: "i1", name: "A" },
    { id: "i2", name: "B" },
    { id: "i3", name: "C" },
    { id: "i4", name: "D" },
    { id: "i5", name: "E" },
  ];
  const usage = itemUsage(items, facets);
  for (const facet of facets) {
    for (const itemId of facet.itemIds) {
      const facetSet = usage.get(itemId);
      assertEquals(facetSet !== undefined, true);
      assertEquals(facetSet!.has(facet.id), true);
    }
  }
});
