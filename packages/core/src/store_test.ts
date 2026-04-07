import { assertEquals } from "@std/assert";
import * as fc from "fast-check";
import { emptyStore, loadStore, type Store, storeToJson } from "./store.ts";
import type { Item } from "./item.ts";
import type { Facet } from "./facet.ts";
import type { Trip } from "./trip.ts";

function makeItem(id: string, name: string, notes?: string): Item {
  return notes !== undefined ? { id, name, notes } : { id, name };
}

function makeFacet(id: string, name: string, itemIds: string[]): Facet {
  return { id, name, itemIds };
}

function makeTrip(
  id: string,
  name: string,
  createdAt: string,
  facetIds: string[],
  checked: string[],
): Trip {
  return { id, name, createdAt, facetIds, checked };
}

Deno.test("emptyStore - returns empty collections", () => {
  const store = emptyStore();
  assertEquals(store.items.length, 0);
  assertEquals(store.facets.length, 0);
  assertEquals(store.trips.length, 0);
});

Deno.test("storeToJson - serializes empty store", () => {
  const json = storeToJson(emptyStore());
  const parsed = JSON.parse(json);
  assertEquals(parsed, { items: [], facets: [], trips: [] });
});

Deno.test("storeToJson - ends with newline", () => {
  const json = storeToJson(emptyStore());
  assertEquals(json.endsWith("\n"), true);
});

Deno.test("storeToJson - serializes items with notes", () => {
  const store: Store = {
    items: [makeItem("i1", "Headlamp", "BD Spot")],
    facets: [],
    trips: [],
  };
  const parsed = JSON.parse(storeToJson(store));
  assertEquals(parsed.items, [
    { id: "i1", name: "Headlamp", notes: "BD Spot" },
  ]);
});

Deno.test("storeToJson - omits notes when undefined", () => {
  const store: Store = {
    items: [makeItem("i1", "Headlamp")],
    facets: [],
    trips: [],
  };
  const parsed = JSON.parse(storeToJson(store));
  assertEquals(parsed.items[0].hasOwnProperty("notes"), false);
});

Deno.test("storeToJson - preserves facet itemIds order", () => {
  const store: Store = {
    items: [],
    facets: [makeFacet("f1", "Trad", ["i3", "i1", "i2"])],
    trips: [],
  };
  const parsed = JSON.parse(storeToJson(store));
  assertEquals(parsed.facets[0].itemIds, ["i3", "i1", "i2"]);
});

Deno.test("storeToJson - preserves trip list order", () => {
  const store: Store = {
    items: [],
    facets: [],
    trips: [makeTrip("t1", "Test", "2025-01-01", ["f2", "f1"], ["i3", "i1"])],
  };
  const parsed = JSON.parse(storeToJson(store));
  assertEquals(parsed.trips[0].facetIds, ["f2", "f1"]);
  assertEquals(parsed.trips[0].checked, ["i3", "i1"]);
});

Deno.test("loadStore - loads empty store from empty object", () => {
  const store = loadStore({});
  assertEquals(store.items.length, 0);
  assertEquals(store.facets.length, 0);
  assertEquals(store.trips.length, 0);
});

Deno.test("loadStore - loads from null", () => {
  const store = loadStore(null);
  assertEquals(store.items.length, 0);
});

Deno.test("loadStore - loads from undefined", () => {
  const store = loadStore(undefined);
  assertEquals(store.items.length, 0);
});

Deno.test("loadStore - loads items", () => {
  const store = loadStore({
    items: [{ id: "i1", name: "Headlamp", notes: "BD" }],
    facets: [],
    trips: [],
  });
  assertEquals(store.items.length, 1);
  assertEquals(store.items[0], { id: "i1", name: "Headlamp", notes: "BD" });
});

Deno.test("loadStore - items without notes omit the field", () => {
  const store = loadStore({
    items: [{ id: "i1", name: "Headlamp" }],
    facets: [],
    trips: [],
  });
  assertEquals(store.items[0].hasOwnProperty("notes"), false);
});

Deno.test("loadStore - loads facet itemIds as array", () => {
  const store = loadStore({
    items: [],
    facets: [{ id: "f1", name: "Trad", itemIds: ["i1", "i2"] }],
    trips: [],
  });
  assertEquals(Array.isArray(store.facets[0].itemIds), true);
  assertEquals(store.facets[0].itemIds, ["i1", "i2"]);
});

Deno.test("loadStore - loads trip facetIds and checked as arrays", () => {
  const store = loadStore({
    items: [],
    facets: [],
    trips: [
      {
        id: "t1",
        name: "Test",
        createdAt: "2025-01-01",
        facetIds: ["f1"],
        checked: ["i1", "i2"],
      },
    ],
  });
  assertEquals(store.trips[0].facetIds, ["f1"]);
  assertEquals(store.trips[0].checked, ["i1", "i2"]);
});

Deno.test("loadStore - handles missing facet itemIds", () => {
  const store = loadStore({
    items: [],
    facets: [{ id: "f1", name: "Trad" }],
    trips: [],
  });
  assertEquals(store.facets[0].itemIds, []);
});

Deno.test("loadStore - handles missing trip facetIds and checked", () => {
  const store = loadStore({
    items: [],
    facets: [],
    trips: [{ id: "t1", name: "Test", createdAt: "2025-01-01" }],
  });
  assertEquals(store.trips[0].facetIds, []);
  assertEquals(store.trips[0].checked, []);
});

// Round-trip tests

Deno.test("round-trip: empty store", () => {
  const original = emptyStore();
  const roundTripped = loadStore(JSON.parse(storeToJson(original)));
  assertEquals(roundTripped, original);
});

Deno.test("round-trip: store with data", () => {
  const original: Store = {
    items: [
      makeItem("i1", "Headlamp", "BD Spot"),
      makeItem("i2", "Harness"),
    ],
    facets: [
      makeFacet("f1", "Trad Rack", ["i1", "i2"]),
      makeFacet("f2", "Camp", []),
    ],
    trips: [
      makeTrip("t1", "Squamish", "2025-07-15", ["f1", "f2"], ["i1"]),
    ],
  };
  const roundTripped = loadStore(JSON.parse(storeToJson(original)));
  assertEquals(roundTripped, original);
});

// Property-based round-trip

const arbItem = fc
  .record({
    id: fc.string({ minLength: 1, maxLength: 10 }),
    name: fc.string({ minLength: 1, maxLength: 20 }).filter((s) =>
      s.trim().length > 0
    ),
    notes: fc.option(
      fc.string({ minLength: 1, maxLength: 30 }),
      { nil: undefined },
    ),
  })
  .map((r): Item =>
    r.notes !== undefined ? { id: r.id, name: r.name, notes: r.notes } : {
      id: r.id,
      name: r.name,
    }
  );

const arbStore = fc
  .array(arbItem, { minLength: 0, maxLength: 5 })
  .chain((items) => {
    const itemIds = items.map((i) => i.id);
    const arbFacet = fc.record({
      id: fc.string({ minLength: 1, maxLength: 10 }),
      name: fc.string({ minLength: 1, maxLength: 20 }).filter((s) =>
        s.trim().length > 0
      ),
      itemIds: fc.subarray(itemIds),
    });
    return fc
      .array(arbFacet, { minLength: 0, maxLength: 3 })
      .chain((facets) => {
        const facetIds = facets.map((f) => f.id);
        const arbTrip = fc.record({
          id: fc.string({ minLength: 1, maxLength: 10 }),
          name: fc.string({ minLength: 1, maxLength: 20 }).filter((s) =>
            s.trim().length > 0
          ),
          createdAt: fc.string({ minLength: 1, maxLength: 20 }),
          facetIds: fc.subarray(facetIds),
          checked: fc.subarray(itemIds),
        });
        return fc
          .array(arbTrip, { minLength: 0, maxLength: 3 })
          .map((trips): Store => ({ items, facets, trips }));
      });
  });

Deno.test("property: round-trip preserves all data", () => {
  fc.assert(
    fc.property(arbStore, (store) => {
      const roundTripped = loadStore(JSON.parse(storeToJson(store)));
      assertEquals(roundTripped, store);
    }),
  );
});
