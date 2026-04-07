import { assertEquals, assertThrows } from "@std/assert";
import * as fc from "fast-check";
import {
  addItemToFacet,
  createFacet,
  deleteFacet,
  type Facet,
  findFacet,
  renameFacet,
  removeItemFromFacet,
} from "./facet.ts";
import type { Item } from "./item.ts";

const testItems: readonly Item[] = [
  { id: "i1", name: "Headlamp" },
  { id: "i2", name: "Harness" },
  { id: "i3", name: "Rope" },
];

Deno.test("createFacet - creates facet with empty itemIds", () => {
  const facets = createFacet([], "f1", "Trad Rack");
  assertEquals(facets.length, 1);
  assertEquals(facets[0].id, "f1");
  assertEquals(facets[0].name, "Trad Rack");
  assertEquals(facets[0].itemIds, []);
});

Deno.test("createFacet - appends to existing facets", () => {
  let facets: readonly Facet[] = [];
  facets = createFacet(facets, "f1", "Trad Rack");
  facets = createFacet(facets, "f2", "Camp Kitchen");
  assertEquals(facets.length, 2);
});

Deno.test("createFacet - throws on empty name", () => {
  assertThrows(
    () => createFacet([], "f1", ""),
    Error,
    "Invariant violation",
  );
});

Deno.test("createFacet - throws on duplicate id", () => {
  const facets = createFacet([], "f1", "Trad Rack");
  assertThrows(
    () => createFacet(facets, "f1", "Camp Kitchen"),
    Error,
    "Invariant violation",
  );
});

Deno.test("renameFacet - renames existing facet", () => {
  const facets = createFacet([], "f1", "Trad Rack");
  const renamed = renameFacet(facets, "f1", "Sport Rack");
  assertEquals(renamed[0].name, "Sport Rack");
});

Deno.test("renameFacet - preserves itemIds", () => {
  let facets = createFacet([], "f1", "Trad Rack");
  facets = addItemToFacet(facets, "f1", "i1", testItems);
  const renamed = renameFacet(facets, "f1", "Sport Rack");
  assertEquals(renamed[0].itemIds.includes("i1"), true);
});

Deno.test("renameFacet - throws on missing facet", () => {
  assertThrows(
    () => renameFacet([], "f1", "New Name"),
    Error,
    "Invariant violation",
  );
});

Deno.test("renameFacet - throws on empty name", () => {
  const facets = createFacet([], "f1", "Trad Rack");
  assertThrows(
    () => renameFacet(facets, "f1", ""),
    Error,
    "Invariant violation",
  );
});

Deno.test("addItemToFacet - adds item to facet", () => {
  const facets = createFacet([], "f1", "Trad Rack");
  const updated = addItemToFacet(facets, "f1", "i1", testItems);
  assertEquals(updated[0].itemIds, ["i1"]);
});

Deno.test("addItemToFacet - adds multiple items preserving order", () => {
  let facets = createFacet([], "f1", "Trad Rack");
  facets = addItemToFacet(facets, "f1", "i2", testItems);
  facets = addItemToFacet(facets, "f1", "i1", testItems);
  assertEquals(facets[0].itemIds, ["i2", "i1"]);
});

Deno.test("addItemToFacet - idempotent (adding same item twice)", () => {
  let facets = createFacet([], "f1", "Trad Rack");
  facets = addItemToFacet(facets, "f1", "i1", testItems);
  facets = addItemToFacet(facets, "f1", "i1", testItems);
  assertEquals(facets[0].itemIds, ["i1"]);
});

Deno.test("addItemToFacet - throws on nonexistent item", () => {
  const facets = createFacet([], "f1", "Trad Rack");
  assertThrows(
    () => addItemToFacet(facets, "f1", "nonexistent", testItems),
    Error,
    "Invariant violation",
  );
});

Deno.test("addItemToFacet - throws on nonexistent facet", () => {
  assertThrows(
    () => addItemToFacet([], "f1", "i1", testItems),
    Error,
    "Invariant violation",
  );
});

Deno.test("addItemToFacet - preserves other facets", () => {
  let facets: readonly Facet[] = [];
  facets = createFacet(facets, "f1", "Trad Rack");
  facets = createFacet(facets, "f2", "Camp Kitchen");
  facets = addItemToFacet(facets, "f1", "i1", testItems);
  assertEquals(facets[1].itemIds, []);
});

Deno.test("removeItemFromFacet - removes item", () => {
  let facets = createFacet([], "f1", "Trad Rack");
  facets = addItemToFacet(facets, "f1", "i1", testItems);
  facets = removeItemFromFacet(facets, "f1", "i1");
  assertEquals(facets[0].itemIds, []);
});

Deno.test("removeItemFromFacet - preserves other items and order", () => {
  let facets = createFacet([], "f1", "Trad Rack");
  facets = addItemToFacet(facets, "f1", "i1", testItems);
  facets = addItemToFacet(facets, "f1", "i2", testItems);
  facets = addItemToFacet(facets, "f1", "i3", testItems);
  facets = removeItemFromFacet(facets, "f1", "i2");
  assertEquals(facets[0].itemIds, ["i1", "i3"]);
});

Deno.test("removeItemFromFacet - throws on nonexistent facet", () => {
  assertThrows(
    () => removeItemFromFacet([], "f1", "i1"),
    Error,
    "Invariant violation",
  );
});

Deno.test("removeItemFromFacet - no-op for item not in facet", () => {
  const facets = createFacet([], "f1", "Trad Rack");
  const result = removeItemFromFacet(facets, "f1", "i1");
  assertEquals(result[0].itemIds, []);
});

Deno.test("deleteFacet - removes facet", () => {
  const facets = createFacet([], "f1", "Trad Rack");
  const deleted = deleteFacet(facets, "f1");
  assertEquals(deleted.length, 0);
});

Deno.test("deleteFacet - preserves other facets", () => {
  let facets: readonly Facet[] = [];
  facets = createFacet(facets, "f1", "Trad Rack");
  facets = createFacet(facets, "f2", "Camp Kitchen");
  const deleted = deleteFacet(facets, "f1");
  assertEquals(deleted.length, 1);
  assertEquals(deleted[0].name, "Camp Kitchen");
});

Deno.test("deleteFacet - throws on missing facet", () => {
  assertThrows(
    () => deleteFacet([], "f1"),
    Error,
    "Invariant violation",
  );
});

Deno.test("findFacet - finds existing facet", () => {
  const facets = createFacet([], "f1", "Trad Rack");
  const found = findFacet(facets, "f1");
  assertEquals(found.name, "Trad Rack");
});

Deno.test("findFacet - throws on missing facet", () => {
  assertThrows(
    () => findFacet([], "f1"),
    Error,
    "Invariant violation",
  );
});

// Property-based tests

const arbName = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0);

Deno.test("property: add then remove item is identity on itemIds", () => {
  fc.assert(
    fc.property(arbName, (name) => {
      let facets = createFacet([], "f1", name);
      facets = addItemToFacet(facets, "f1", "i1", testItems);
      facets = removeItemFromFacet(facets, "f1", "i1");
      assertEquals(facets[0].itemIds, []);
    }),
  );
});

Deno.test("property: adding same item multiple times is idempotent", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 10 }),
      (count) => {
        let facets = createFacet([], "f1", "Test");
        for (let i = 0; i < count; i++) {
          facets = addItemToFacet(facets, "f1", "i1", testItems);
        }
        assertEquals(facets[0].itemIds, ["i1"]);
      },
    ),
  );
});

Deno.test("property: create N facets then delete all yields empty", () => {
  fc.assert(
    fc.property(
      fc.array(arbName, { minLength: 1, maxLength: 10 }),
      (names) => {
        let facets: readonly Facet[] = [];
        const ids: string[] = [];
        for (let i = 0; i < names.length; i++) {
          const id = `f-${i}`;
          ids.push(id);
          facets = createFacet(facets, id, names[i]);
        }
        for (const id of ids) {
          facets = deleteFacet(facets, id);
        }
        assertEquals(facets.length, 0);
      },
    ),
  );
});
