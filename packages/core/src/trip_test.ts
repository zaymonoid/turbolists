import { assertEquals, assertThrows } from "@std/assert";
import * as fc from "fast-check";
import {
  addKitToTrip,
  createTrip,
  deleteTrip,
  duplicateTrip,
  removeKitFromTrip,
  renameTrip,
  resetChecks,
  setTripArchived,
  toggleChecked,
  type Trip,
} from "./trip.ts";
import { kitId, itemId, tripId } from "./ids.ts";
import type { KitId, ItemId, TripId } from "./ids.ts";

const t1 = tripId("t1");
const t2 = tripId("t2");
const f1 = kitId("f1");
const f2 = kitId("f2");
const i1 = itemId("i1");
const i2 = itemId("i2");

const arbName = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0);

Deno.test("createTrip - creates trip", () => {
  const trips = createTrip([], t1, "Squamish Weekend", "2025-07-15");
  assertEquals(trips.length, 1);
  assertEquals(trips[0].id, t1);
  assertEquals(trips[0].name, "Squamish Weekend");
  assertEquals(trips[0].createdAt, "2025-07-15");
  assertEquals(trips[0].kitIds, []);
  assertEquals(trips[0].checked, new Set());
});

Deno.test("createTrip - appends to existing trips", () => {
  let trips: readonly Trip[] = [];
  trips = createTrip(trips, t1, "Squamish", "2025-07-15");
  trips = createTrip(trips, t2, "Smith Rock", "2025-08-01");
  assertEquals(trips.length, 2);
});

Deno.test("createTrip - throws on empty name", () => {
  assertThrows(
    () => createTrip([], t1, "", "2025-07-15"),
    Error,
    "Invariant violation",
  );
});

Deno.test("createTrip - throws on duplicate id", () => {
  const trips = createTrip([], t1, "Squamish", "2025-07-15");
  assertThrows(
    () => createTrip(trips, t1, "Smith Rock", "2025-08-01"),
    Error,
    "Invariant violation",
  );
});

Deno.test("renameTrip - renames existing trip", () => {
  const trips = createTrip([], t1, "Squamish", "2025-07-15");
  assertEquals(renameTrip(trips, t1, "Squamish v2")[0].name, "Squamish v2");
});

Deno.test("renameTrip - preserves other fields", () => {
  let trips = createTrip([], t1, "Squamish", "2025-07-15");
  trips = addKitToTrip(trips, t1, f1);
  trips = toggleChecked(trips, t1, i1);
  const renamed = renameTrip(trips, t1, "New Name");
  assertEquals(renamed[0].kitIds, [f1]);
  assertEquals(renamed[0].checked, new Set([i1]));
  assertEquals(renamed[0].createdAt, "2025-07-15");
});

Deno.test("renameTrip - throws on missing trip", () => {
  assertThrows(
    () => renameTrip([], t1, "New Name"),
    Error,
    "Invariant violation",
  );
});

Deno.test("renameTrip - throws on empty name", () => {
  const trips = createTrip([], t1, "Squamish", "2025-07-15");
  assertThrows(
    () => renameTrip(trips, t1, ""),
    Error,
    "Invariant violation",
  );
});

Deno.test("addKitToTrip - adds kit", () => {
  const trips = createTrip([], t1, "Squamish", "2025-07-15");
  assertEquals(addKitToTrip(trips, t1, f1)[0].kitIds, [f1]);
});

Deno.test("addKitToTrip - adds multiple kits preserving order", () => {
  let trips = createTrip([], t1, "Squamish", "2025-07-15");
  trips = addKitToTrip(trips, t1, f2);
  trips = addKitToTrip(trips, t1, f1);
  assertEquals(trips[0].kitIds, [f2, f1]);
});

Deno.test("addKitToTrip - idempotent", () => {
  let trips = createTrip([], t1, "Squamish", "2025-07-15");
  trips = addKitToTrip(trips, t1, f1);
  trips = addKitToTrip(trips, t1, f1);
  assertEquals(trips[0].kitIds, [f1]);
});

Deno.test("addKitToTrip - throws on nonexistent trip", () => {
  assertThrows(
    () => addKitToTrip([], t1, f1),
    Error,
    "Invariant violation",
  );
});

Deno.test("removeKitFromTrip - removes kit", () => {
  let trips = createTrip([], t1, "Squamish", "2025-07-15");
  trips = addKitToTrip(trips, t1, f1);
  assertEquals(removeKitFromTrip(trips, t1, f1)[0].kitIds, []);
});

Deno.test("removeKitFromTrip - preserves other kits and order", () => {
  let trips = createTrip([], t1, "Squamish", "2025-07-15");
  trips = addKitToTrip(trips, t1, f1);
  trips = addKitToTrip(trips, t1, f2);
  assertEquals(removeKitFromTrip(trips, t1, f1)[0].kitIds, [f2]);
});

Deno.test("removeKitFromTrip - throws on nonexistent trip", () => {
  assertThrows(
    () => removeKitFromTrip([], t1, f1),
    Error,
    "Invariant violation",
  );
});

Deno.test("toggleChecked - checks an item", () => {
  const trips = createTrip([], t1, "Squamish", "2025-07-15");
  assertEquals(toggleChecked(trips, t1, i1)[0].checked, new Set([i1]));
});

Deno.test("toggleChecked - unchecks a checked item", () => {
  let trips = createTrip([], t1, "Squamish", "2025-07-15");
  trips = toggleChecked(trips, t1, i1);
  trips = toggleChecked(trips, t1, i1);
  assertEquals(trips[0].checked, new Set());
});

Deno.test("toggleChecked - preserves other checked items", () => {
  let trips = createTrip([], t1, "Squamish", "2025-07-15");
  trips = toggleChecked(trips, t1, i1);
  trips = toggleChecked(trips, t1, i2);
  trips = toggleChecked(trips, t1, i1);
  assertEquals(trips[0].checked, new Set([i2]));
});

Deno.test("toggleChecked - throws on nonexistent trip", () => {
  assertThrows(
    () => toggleChecked([], t1, i1),
    Error,
    "Invariant violation",
  );
});

Deno.test("resetChecks - clears all checked items", () => {
  let trips = createTrip([], t1, "Squamish", "2025-07-15");
  trips = toggleChecked(trips, t1, i1);
  trips = toggleChecked(trips, t1, i2);
  assertEquals(resetChecks(trips, t1)[0].checked, new Set());
});

Deno.test("resetChecks - no-op on already empty", () => {
  const trips = createTrip([], t1, "Squamish", "2025-07-15");
  assertEquals(resetChecks(trips, t1)[0].checked, new Set());
});

Deno.test("resetChecks - throws on nonexistent trip", () => {
  assertThrows(() => resetChecks([], t1), Error, "Invariant violation");
});

Deno.test("deleteTrip - removes trip", () => {
  assertEquals(
    deleteTrip(createTrip([], t1, "Sq", "2025-07-15"), t1).length,
    0,
  );
});

Deno.test("deleteTrip - preserves other trips", () => {
  let trips: readonly Trip[] = [];
  trips = createTrip(trips, t1, "Squamish", "2025-07-15");
  trips = createTrip(trips, t2, "Smith Rock", "2025-08-01");
  const deleted = deleteTrip(trips, t1);
  assertEquals(deleted.length, 1);
  assertEquals(deleted[0].name, "Smith Rock");
});

Deno.test("deleteTrip - throws on missing trip", () => {
  assertThrows(() => deleteTrip([], t1), Error, "Invariant violation");
});

// Property-based tests

Deno.test("property: toggle is self-inverse", () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 10 }).map((s) => itemId(s)),
      (id) => {
        let trips = createTrip([], t1, "Test", "2025-01-01");
        trips = toggleChecked(trips, t1, id);
        trips = toggleChecked(trips, t1, id);
        assertEquals(trips[0].checked, new Set());
      },
    ),
  );
});

Deno.test("property: resetChecks always yields empty checked set", () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.string({ minLength: 1, maxLength: 10 }).map((s) => itemId(s)),
        { minLength: 0, maxLength: 10 },
      ),
      (itemIds) => {
        let trips = createTrip([], t1, "Test", "2025-01-01");
        for (const id of itemIds) {
          trips = toggleChecked(trips, t1, id);
        }
        assertEquals(resetChecks(trips, t1)[0].checked, new Set());
      },
    ),
  );
});

Deno.test("property: add then remove kit is identity on kitIds", () => {
  fc.assert(
    fc.property(
      fc.constantFrom(f1, f2),
      (fId) => {
        let trips = createTrip([], t1, "Test", "2025-01-01");
        trips = addKitToTrip(trips, t1, fId);
        assertEquals(removeKitFromTrip(trips, t1, fId)[0].kitIds, []);
      },
    ),
  );
});

Deno.test("duplicateTrip reuses kits with fresh progress and leaves the original intact", () => {
  const source = toggleChecked(
    addKitToTrip(createTrip([], t1, "Coast", "2026-01-01"), t1, f1),
    t1,
    i1,
  );
  const result = duplicateTrip(source, t1, t2, "Coast again", "2026-11-10");
  assertEquals(result[0], source[0]);
  assertEquals(result[1], {
    id: t2,
    name: "Coast again",
    createdAt: "2026-11-10",
    kitIds: [f1],
    checked: new Set<ItemId>(),
  });
  const changed = toggleChecked(removeKitFromTrip(result, t2, f1), t2, i2);
  assertEquals(changed[0].kitIds, [f1]);
  assertEquals(changed[0].checked, new Set([i1]));
});

Deno.test("duplicateTrip rejects missing sources, duplicate IDs and empty names", () => {
  const source = createTrip([], t1, "Coast", "2026-01-01");
  assertThrows(() =>
    duplicateTrip(source, t2, tripId("t3"), "Copy", "2026-11-10")
  );
  assertThrows(() => duplicateTrip(source, t1, t1, "Copy", "2026-11-10"));
  assertThrows(() => duplicateTrip(source, t1, t2, "   ", "2026-11-10"));
});

Deno.test("archiving preserves packing progress, can be restored, and copies start active", () => {
  const original = toggleChecked(
    addKitToTrip(createTrip([], t1, "Coast", "2026-11-10"), t1, f1),
    t1,
    i1,
  );
  const archived = setTripArchived(original, t1, true);
  assertEquals(archived[0].archived, true);
  assertEquals(archived[0].checked, original[0].checked);
  assertEquals(archived[0].kitIds, original[0].kitIds);
  assertEquals(original[0].archived, undefined);
  assertEquals(setTripArchived(archived, t1, false)[0].archived, false);
  assertEquals(
    duplicateTrip(archived, t1, t2, "Again", "2026-11-11")[1].archived,
    undefined,
  );
  assertThrows(() => setTripArchived(original, t2, true));
});
