import { assertEquals } from "@std/assert";
import * as fc from "fast-check";
import {
  deleteStoreKit,
  deleteStoreItem,
  emptyStore,
  loadStore,
  type Store,
  storeToJson,
} from "./store.ts";
import { kitId, itemId, tripId } from "./ids.ts";
import type { KitId, ItemId, TripId } from "./ids.ts";
import type { Item } from "./item.ts";
import type { Kit } from "./kit.ts";
import type { Trip } from "./trip.ts";

const i1 = itemId("i1");
const i2 = itemId("i2");
const f1 = kitId("f1");
const f2 = kitId("f2");
const t1 = tripId("t1");

function makeItem(id: ItemId, name: string, notes?: string): Item {
  return notes !== undefined ? { id, name, notes } : { id, name };
}

function makeKit(id: KitId, name: string, itemIds: ItemId[]): Kit {
  return { id, name, itemIds };
}

function makeTrip(
  id: TripId,
  name: string,
  createdAt: string,
  fIds: KitId[],
  checked: ItemId[],
): Trip {
  return { id, name, createdAt, kitIds: fIds, checked: new Set(checked) };
}

// emptyStore

Deno.test("emptyStore - returns empty collections", () => {
  const store = emptyStore();
  assertEquals(store.items.length, 0);
  assertEquals(store.kits.length, 0);
  assertEquals(store.trips.length, 0);
});

// storeToJson

Deno.test("storeToJson - serializes empty store", () => {
  assertEquals(JSON.parse(storeToJson(emptyStore())), {
    items: [],
    kits: [],
    trips: [],
  });
});

Deno.test("storeToJson - ends with newline", () => {
  assertEquals(storeToJson(emptyStore()).endsWith("\n"), true);
});

Deno.test("storeToJson - serializes items with notes", () => {
  const store: Store = {
    items: [makeItem(i1, "Headlamp", "BD Spot")],
    kits: [],
    trips: [],
  };
  assertEquals(JSON.parse(storeToJson(store)).items, [
    { id: "i1", name: "Headlamp", notes: "BD Spot" },
  ]);
});

Deno.test("storeToJson - omits notes when undefined", () => {
  const store: Store = {
    items: [makeItem(i1, "Headlamp")],
    kits: [],
    trips: [],
  };
  assertEquals(
    JSON.parse(storeToJson(store)).items[0].hasOwnProperty("notes"),
    false,
  );
});

Deno.test("storeToJson - preserves kit itemIds order", () => {
  const store: Store = {
    items: [],
    kits: [makeKit(f1, "Trad", [itemId("i3"), i1, i2])],
    trips: [],
  };
  assertEquals(
    JSON.parse(storeToJson(store)).kits[0].itemIds,
    ["i3", "i1", "i2"],
  );
});

Deno.test("storeToJson - serializes trip checked as sorted array", () => {
  const store: Store = {
    items: [],
    kits: [],
    trips: [makeTrip(t1, "Test", "2025-01-01", [f2, f1], [itemId("i3"), i1])],
  };
  const parsed = JSON.parse(storeToJson(store)).trips[0];
  assertEquals(parsed.kitIds, ["f2", "f1"]);
  assertEquals(parsed.checked, ["i1", "i3"]); // sorted
});

// loadStore

Deno.test("loadStore - loads from null", () => {
  assertEquals(loadStore(null).items.length, 0);
});

Deno.test("loadStore - loads from undefined", () => {
  assertEquals(loadStore(undefined).items.length, 0);
});

Deno.test("loadStore - loads from empty object", () => {
  const store = loadStore({});
  assertEquals(store.items.length, 0);
  assertEquals(store.kits.length, 0);
  assertEquals(store.trips.length, 0);
});

Deno.test("loadStore - loads items", () => {
  const store = loadStore({
    items: [{ id: "i1", name: "Headlamp", notes: "BD" }],
  });
  assertEquals(store.items[0].id, i1);
  assertEquals(store.items[0].name, "Headlamp");
  assertEquals(store.items[0].notes, "BD");
});

Deno.test("loadStore - items without notes omit the field", () => {
  const store = loadStore({ items: [{ id: "i1", name: "Headlamp" }] });
  assertEquals(store.items[0].hasOwnProperty("notes"), false);
});

Deno.test("loadStore - loads kit itemIds as array", () => {
  const store = loadStore({
    kits: [{ id: "f1", name: "Trad", itemIds: ["i1", "i2"] }],
  });
  assertEquals(store.kits[0].itemIds, [i1, i2]);
});

Deno.test("loadStore - loads trip checked as Set", () => {
  const store = loadStore({
    trips: [{
      id: "t1",
      name: "Test",
      createdAt: "2025-01-01",
      kitIds: ["f1"],
      checked: ["i1", "i2"],
    }],
  });
  assertEquals(store.trips[0].kitIds, [kitId("f1")]);
  assertEquals(store.trips[0].checked, new Set([i1, i2]));
});

Deno.test("loadStore - handles missing kit itemIds", () => {
  const store = loadStore({ kits: [{ id: "f1", name: "Trad" }] });
  assertEquals(store.kits[0].itemIds, []);
});

Deno.test("loadStore - handles missing trip kitIds and checked", () => {
  const store = loadStore({
    trips: [{ id: "t1", name: "Test", createdAt: "2025-01-01" }],
  });
  assertEquals(store.trips[0].kitIds, []);
  assertEquals(store.trips[0].checked, new Set());
});

// loadStore dedup

Deno.test("loadStore - deduplicates items by id", () => {
  const store = loadStore({
    items: [
      { id: "i1", name: "First" },
      { id: "i1", name: "Duplicate" },
    ],
  });
  assertEquals(store.items.length, 1);
  assertEquals(store.items[0].name, "First");
});

Deno.test("loadStore - deduplicates kits by id", () => {
  const store = loadStore({
    kits: [
      { id: "f1", name: "First", itemIds: [] },
      { id: "f1", name: "Duplicate", itemIds: [] },
    ],
  });
  assertEquals(store.kits.length, 1);
  assertEquals(store.kits[0].name, "First");
});

Deno.test("loadStore - deduplicates trips by id", () => {
  const store = loadStore({
    trips: [
      { id: "t1", name: "First", createdAt: "2025-01-01" },
      { id: "t1", name: "Duplicate", createdAt: "2025-01-01" },
    ],
  });
  assertEquals(store.trips.length, 1);
  assertEquals(store.trips[0].name, "First");
});

Deno.test("loadStore - deduplicates kit itemIds", () => {
  const store = loadStore({
    kits: [{ id: "f1", name: "Trad", itemIds: ["i1", "i2", "i1"] }],
  });
  assertEquals(store.kits[0].itemIds, [i1, i2]);
});

Deno.test("loadStore - deduplicates trip kitIds", () => {
  const store = loadStore({
    trips: [{
      id: "t1",
      name: "Test",
      createdAt: "2025-01-01",
      kitIds: ["f1", "f2", "f1"],
    }],
  });
  assertEquals(store.trips[0].kitIds, [kitId("f1"), kitId("f2")]);
});

// Round-trip tests

Deno.test("round-trip: empty store", () => {
  const original = emptyStore();
  const roundTripped = loadStore(JSON.parse(storeToJson(original)));
  assertStoreEqual(roundTripped, original);
});

Deno.test("round-trip: store with data", () => {
  const original: Store = {
    items: [makeItem(i1, "Headlamp", "BD Spot"), makeItem(i2, "Harness")],
    kits: [makeKit(f1, "Trad Rack", [i1, i2]), makeKit(f2, "Camp", [])],
    trips: [makeTrip(t1, "Squamish", "2025-07-15", [f1, f2], [i1])],
  };
  const roundTripped = loadStore(JSON.parse(storeToJson(original)));
  assertStoreEqual(roundTripped, original);
});

// Property-based round-trip

const arbItemId = fc.string({ minLength: 1, maxLength: 10 }).map(itemId);
const arbKitId = fc.string({ minLength: 1, maxLength: 10 }).map(kitId);
const arbTripId = fc.string({ minLength: 1, maxLength: 10 }).map(tripId);
const arbName = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0);

const arbItem = fc
  .record({
    id: arbItemId,
    name: arbName,
    notes: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
      nil: undefined,
    }),
  })
  .map((r): Item =>
    r.notes !== undefined
      ? { id: r.id, name: r.name, notes: r.notes }
      : { id: r.id, name: r.name }
  );

const arbStore = fc
  .array(arbItem, { minLength: 0, maxLength: 5 })
  .chain((items) => {
    const iIds = items.map((i) => i.id);
    const arbKit = fc.record({
      id: arbKitId,
      name: arbName,
      itemIds: fc.subarray(iIds),
    });
    return fc
      .array(arbKit, { minLength: 0, maxLength: 3 })
      .chain((kits) => {
        const fIds = kits.map((f) => f.id);
        const arbTrip = fc.record({
          id: arbTripId,
          name: arbName,
          createdAt: fc.string({ minLength: 1, maxLength: 20 }),
          kitIds: fc.subarray(fIds),
          checked: fc.subarray(iIds).map((ids) => new Set(ids)),
        });
        return fc
          .array(arbTrip, { minLength: 0, maxLength: 3 })
          .map((trips): Store => ({ items, kits, trips }));
      });
  });

Deno.test("property: round-trip preserves all data", () => {
  fc.assert(
    fc.property(arbStore, (store) => {
      const roundTripped = loadStore(JSON.parse(storeToJson(store)));
      assertStoreEqual(roundTripped, store);
    }),
  );
});

function assertStoreEqual(actual: Store, expected: Store): void {
  assertEquals(actual.items, expected.items);
  assertEquals(actual.kits, expected.kits);
  assertEquals(actual.trips.length, expected.trips.length);
  for (let i = 0; i < actual.trips.length; i++) {
    assertEquals(actual.trips[i].id, expected.trips[i].id);
    assertEquals(actual.trips[i].name, expected.trips[i].name);
    assertEquals(actual.trips[i].createdAt, expected.trips[i].createdAt);
    assertEquals(actual.trips[i].kitIds, expected.trips[i].kitIds);
    assertEquals(actual.trips[i].checked, expected.trips[i].checked);
  }
}

Deno.test("deleteStoreItem removes references across kits and packing progress", () => {
  const original: Store = {
    items: [makeItem(i1, "Charger"), makeItem(i2, "Sunscreen")],
    kits: [
      makeKit(f1, "Essentials", [i1]),
      makeKit(f2, "Beach", [i1, i2]),
    ],
    trips: [makeTrip(t1, "Coast", "2026-11-10", [f1, f2], [i1, i2])],
  };
  const result = deleteStoreItem(original, i1);
  assertEquals(result.items.map((i) => i.id), [i2]);
  assertEquals(result.kits.map((f) => f.itemIds), [[], [i2]]);
  assertEquals([...result.trips[0].checked], [i2]);
  assertEquals(original.kits[0].itemIds, [i1]);
  assertEquals([...original.trips[0].checked], [i1, i2]);
});

Deno.test("deleteStoreKit updates every trip without deleting library items", () => {
  const original: Store = {
    items: [makeItem(i1, "Charger")],
    kits: [makeKit(f1, "Essentials", [i1]), makeKit(f2, "Beach", [i1])],
    trips: [makeTrip(t1, "Coast", "2026-11-10", [f1, f2], [i1])],
  };
  const result = deleteStoreKit(original, f1);
  assertEquals(result.kits.map((f) => f.id), [f2]);
  assertEquals(result.trips[0].kitIds, [f2]);
  assertEquals(result.items, original.items);
  assertEquals([...result.trips[0].checked], [i1]);
  assertEquals(original.trips[0].kitIds, [f1, f2]);
});

Deno.test("archive status round trips while legacy trips remain active", () => {
  const data = {
    items: [],
    kits: [],
    trips: [{ id: "t1", name: "Old", createdAt: "2026-11-10", archived: true }],
  };
  assertEquals(
    loadStore(JSON.parse(storeToJson(loadStore(data)))).trips[0].archived,
    true,
  );
  assertEquals(
    loadStore({ trips: [{ id: "t1", name: "Legacy" }] }).trips[0].archived,
    undefined,
  );
  assertEquals(
    loadStore({ trips: [{ id: "t1", name: "Bad flag", archived: "false" }] })
      .trips[0].archived,
    undefined,
  );
});
