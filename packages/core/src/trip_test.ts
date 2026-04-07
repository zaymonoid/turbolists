import { assertEquals, assertThrows } from "@std/assert";
import * as fc from "fast-check";
import {
  addFacetToTrip,
  createTrip,
  deleteTrip,
  removeFacetFromTrip,
  resetChecks,
  toggleChecked,
  type Trip,
} from "./trip.ts";
import type { Facet } from "./facet.ts";

const testFacets: readonly Facet[] = [
  { id: "f1", name: "Trad Rack", itemIds: ["i1", "i2"] },
  { id: "f2", name: "Camp Kitchen", itemIds: ["i3"] },
];

Deno.test("createTrip - creates trip", () => {
  const trips = createTrip([], "t1", "Squamish Weekend", "2025-07-15");
  assertEquals(trips.length, 1);
  assertEquals(trips[0].id, "t1");
  assertEquals(trips[0].name, "Squamish Weekend");
  assertEquals(trips[0].createdAt, "2025-07-15");
  assertEquals(trips[0].facetIds, []);
  assertEquals(trips[0].checked, []);
});

Deno.test("createTrip - appends to existing trips", () => {
  let trips: readonly Trip[] = [];
  trips = createTrip(trips, "t1", "Squamish", "2025-07-15");
  trips = createTrip(trips, "t2", "Smith Rock", "2025-08-01");
  assertEquals(trips.length, 2);
});

Deno.test("createTrip - throws on empty name", () => {
  assertThrows(
    () => createTrip([], "t1", "", "2025-07-15"),
    Error,
    "Invariant violation",
  );
});

Deno.test("createTrip - throws on duplicate id", () => {
  const trips = createTrip([], "t1", "Squamish", "2025-07-15");
  assertThrows(
    () => createTrip(trips, "t1", "Smith Rock", "2025-08-01"),
    Error,
    "Invariant violation",
  );
});

Deno.test("addFacetToTrip - adds facet", () => {
  const trips = createTrip([], "t1", "Squamish", "2025-07-15");
  const updated = addFacetToTrip(trips, "t1", "f1", testFacets);
  assertEquals(updated[0].facetIds, ["f1"]);
});

Deno.test("addFacetToTrip - adds multiple facets preserving order", () => {
  let trips = createTrip([], "t1", "Squamish", "2025-07-15");
  trips = addFacetToTrip(trips, "t1", "f2", testFacets);
  trips = addFacetToTrip(trips, "t1", "f1", testFacets);
  assertEquals(trips[0].facetIds, ["f2", "f1"]);
});

Deno.test("addFacetToTrip - idempotent", () => {
  let trips = createTrip([], "t1", "Squamish", "2025-07-15");
  trips = addFacetToTrip(trips, "t1", "f1", testFacets);
  trips = addFacetToTrip(trips, "t1", "f1", testFacets);
  assertEquals(trips[0].facetIds, ["f1"]);
});

Deno.test("addFacetToTrip - throws on nonexistent facet", () => {
  const trips = createTrip([], "t1", "Squamish", "2025-07-15");
  assertThrows(
    () => addFacetToTrip(trips, "t1", "nonexistent", testFacets),
    Error,
    "Invariant violation",
  );
});

Deno.test("addFacetToTrip - throws on nonexistent trip", () => {
  assertThrows(
    () => addFacetToTrip([], "t1", "f1", testFacets),
    Error,
    "Invariant violation",
  );
});

Deno.test("removeFacetFromTrip - removes facet", () => {
  let trips = createTrip([], "t1", "Squamish", "2025-07-15");
  trips = addFacetToTrip(trips, "t1", "f1", testFacets);
  trips = removeFacetFromTrip(trips, "t1", "f1");
  assertEquals(trips[0].facetIds, []);
});

Deno.test("removeFacetFromTrip - preserves other facets and order", () => {
  let trips = createTrip([], "t1", "Squamish", "2025-07-15");
  trips = addFacetToTrip(trips, "t1", "f1", testFacets);
  trips = addFacetToTrip(trips, "t1", "f2", testFacets);
  trips = removeFacetFromTrip(trips, "t1", "f1");
  assertEquals(trips[0].facetIds, ["f2"]);
});

Deno.test("removeFacetFromTrip - throws on nonexistent trip", () => {
  assertThrows(
    () => removeFacetFromTrip([], "t1", "f1"),
    Error,
    "Invariant violation",
  );
});

Deno.test("toggleChecked - checks an item", () => {
  const trips = createTrip([], "t1", "Squamish", "2025-07-15");
  const toggled = toggleChecked(trips, "t1", "i1");
  assertEquals(toggled[0].checked, ["i1"]);
});

Deno.test("toggleChecked - unchecks a checked item", () => {
  let trips = createTrip([], "t1", "Squamish", "2025-07-15");
  trips = toggleChecked(trips, "t1", "i1");
  trips = toggleChecked(trips, "t1", "i1");
  assertEquals(trips[0].checked, []);
});

Deno.test("toggleChecked - preserves other checked items and order", () => {
  let trips = createTrip([], "t1", "Squamish", "2025-07-15");
  trips = toggleChecked(trips, "t1", "i1");
  trips = toggleChecked(trips, "t1", "i2");
  trips = toggleChecked(trips, "t1", "i1");
  assertEquals(trips[0].checked, ["i2"]);
});

Deno.test("toggleChecked - throws on nonexistent trip", () => {
  assertThrows(
    () => toggleChecked([], "t1", "i1"),
    Error,
    "Invariant violation",
  );
});

Deno.test("resetChecks - clears all checked items", () => {
  let trips = createTrip([], "t1", "Squamish", "2025-07-15");
  trips = toggleChecked(trips, "t1", "i1");
  trips = toggleChecked(trips, "t1", "i2");
  trips = resetChecks(trips, "t1");
  assertEquals(trips[0].checked, []);
});

Deno.test("resetChecks - no-op on already empty", () => {
  const trips = createTrip([], "t1", "Squamish", "2025-07-15");
  const reset = resetChecks(trips, "t1");
  assertEquals(reset[0].checked, []);
});

Deno.test("resetChecks - throws on nonexistent trip", () => {
  assertThrows(
    () => resetChecks([], "t1"),
    Error,
    "Invariant violation",
  );
});

Deno.test("deleteTrip - removes trip", () => {
  const trips = createTrip([], "t1", "Squamish", "2025-07-15");
  const deleted = deleteTrip(trips, "t1");
  assertEquals(deleted.length, 0);
});

Deno.test("deleteTrip - preserves other trips", () => {
  let trips: readonly Trip[] = [];
  trips = createTrip(trips, "t1", "Squamish", "2025-07-15");
  trips = createTrip(trips, "t2", "Smith Rock", "2025-08-01");
  const deleted = deleteTrip(trips, "t1");
  assertEquals(deleted.length, 1);
  assertEquals(deleted[0].name, "Smith Rock");
});

Deno.test("deleteTrip - throws on missing trip", () => {
  assertThrows(
    () => deleteTrip([], "t1"),
    Error,
    "Invariant violation",
  );
});

// Property-based tests

Deno.test("property: toggle is self-inverse", () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 10 }),
      (itemId) => {
        let trips = createTrip([], "t1", "Test", "2025-01-01");
        trips = toggleChecked(trips, "t1", itemId);
        trips = toggleChecked(trips, "t1", itemId);
        assertEquals(trips[0].checked, []);
      },
    ),
  );
});

Deno.test("property: resetChecks always yields empty checked", () => {
  fc.assert(
    fc.property(
      fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
        minLength: 0,
        maxLength: 10,
      }),
      (itemIds) => {
        let trips = createTrip([], "t1", "Test", "2025-01-01");
        for (const id of itemIds) {
          trips = toggleChecked(trips, "t1", id);
        }
        trips = resetChecks(trips, "t1");
        assertEquals(trips[0].checked, []);
      },
    ),
  );
});

Deno.test("property: add then remove facet is identity on facetIds", () => {
  fc.assert(
    fc.property(
      fc.constantFrom("f1", "f2"),
      (facetId) => {
        let trips = createTrip([], "t1", "Test", "2025-01-01");
        trips = addFacetToTrip(trips, "t1", facetId, testFacets);
        trips = removeFacetFromTrip(trips, "t1", facetId);
        assertEquals(trips[0].facetIds, []);
      },
    ),
  );
});
