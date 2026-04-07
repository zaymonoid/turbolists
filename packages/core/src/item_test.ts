import { assertEquals, assertThrows } from "@std/assert";
import * as fc from "fast-check";
import {
  createItem,
  deleteItem,
  findItem,
  type Item,
  renameItem,
} from "./item.ts";
import type { Facet } from "./facet.ts";

const noFacets: readonly Facet[] = [];

Deno.test("createItem - creates item with name", () => {
  const items = createItem([], "01", "Headlamp");
  assertEquals(items.length, 1);
  assertEquals(items[0], { id: "01", name: "Headlamp" });
});

Deno.test("createItem - creates item with notes", () => {
  const items = createItem([], "01", "Headlamp", "Black Diamond Spot");
  assertEquals(items[0], {
    id: "01",
    name: "Headlamp",
    notes: "Black Diamond Spot",
  });
});

Deno.test("createItem - appends to existing items", () => {
  let items: readonly Item[] = [];
  items = createItem(items, "01", "Headlamp");
  items = createItem(items, "02", "Harness");
  assertEquals(items.length, 2);
  assertEquals(items[0].name, "Headlamp");
  assertEquals(items[1].name, "Harness");
});

Deno.test("createItem - throws on empty name", () => {
  assertThrows(
    () => createItem([], "01", ""),
    Error,
    "Invariant violation",
  );
});

Deno.test("createItem - throws on whitespace-only name", () => {
  assertThrows(
    () => createItem([], "01", "   "),
    Error,
    "Invariant violation",
  );
});

Deno.test("createItem - throws on duplicate id", () => {
  const items = createItem([], "01", "Headlamp");
  assertThrows(
    () => createItem(items, "01", "Harness"),
    Error,
    "Invariant violation",
  );
});

Deno.test("renameItem - renames existing item", () => {
  const items = createItem([], "01", "Headlamp");
  const renamed = renameItem(items, "01", "LED Headlamp");
  assertEquals(renamed[0].name, "LED Headlamp");
});

Deno.test("renameItem - preserves other items", () => {
  let items: readonly Item[] = [];
  items = createItem(items, "01", "Headlamp");
  items = createItem(items, "02", "Harness");
  const renamed = renameItem(items, "01", "LED Headlamp");
  assertEquals(renamed.length, 2);
  assertEquals(renamed[0].name, "LED Headlamp");
  assertEquals(renamed[1].name, "Harness");
});

Deno.test("renameItem - preserves notes", () => {
  const items = createItem([], "01", "Headlamp", "my notes");
  const renamed = renameItem(items, "01", "LED Headlamp");
  assertEquals(renamed[0].notes, "my notes");
});

Deno.test("renameItem - throws on missing item", () => {
  assertThrows(
    () => renameItem([], "01", "Headlamp"),
    Error,
    "Invariant violation",
  );
});

Deno.test("renameItem - throws on empty name", () => {
  const items = createItem([], "01", "Headlamp");
  assertThrows(
    () => renameItem(items, "01", ""),
    Error,
    "Invariant violation",
  );
});

Deno.test("deleteItem - removes item", () => {
  const items = createItem([], "01", "Headlamp");
  const deleted = deleteItem(items, "01", noFacets);
  assertEquals(deleted.length, 0);
});

Deno.test("deleteItem - preserves other items", () => {
  let items: readonly Item[] = [];
  items = createItem(items, "01", "Headlamp");
  items = createItem(items, "02", "Harness");
  const deleted = deleteItem(items, "01", noFacets);
  assertEquals(deleted.length, 1);
  assertEquals(deleted[0].name, "Harness");
});

Deno.test("deleteItem - throws on missing item", () => {
  assertThrows(
    () => deleteItem([], "01", noFacets),
    Error,
    "Invariant violation",
  );
});

Deno.test("deleteItem - throws if item referenced by facet", () => {
  const items = createItem([], "01", "Headlamp");
  const facets: readonly Facet[] = [
    { id: "f1", name: "Camp", itemIds: ["01"] },
  ];
  assertThrows(
    () => deleteItem(items, "01", facets),
    Error,
    "Invariant violation",
  );
});

Deno.test("deleteItem - error message includes referencing facet names", () => {
  const items = createItem([], "01", "Headlamp");
  const facets: readonly Facet[] = [
    { id: "f1", name: "Camp", itemIds: ["01"] },
    { id: "f2", name: "Climb", itemIds: ["01"] },
  ];
  assertThrows(
    () => deleteItem(items, "01", facets),
    Error,
    "Camp",
  );
});

Deno.test("findItem - finds existing item", () => {
  const items = createItem([], "01", "Headlamp");
  const found = findItem(items, "01");
  assertEquals(found.name, "Headlamp");
});

Deno.test("findItem - throws on missing item", () => {
  assertThrows(
    () => findItem([], "01"),
    Error,
    "Invariant violation",
  );
});

// Property-based tests

Deno.test("property: create N items then delete in reverse yields empty", () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) =>
          s.trim().length > 0
        ),
        { minLength: 1, maxLength: 10 },
      ),
      (names) => {
        let items: readonly Item[] = [];
        const ids: string[] = [];
        for (let i = 0; i < names.length; i++) {
          const id = `item-${i}`;
          ids.push(id);
          items = createItem(items, id, names[i]);
        }
        for (let i = ids.length - 1; i >= 0; i--) {
          items = deleteItem(items, ids[i], noFacets);
        }
        assertEquals(items.length, 0);
      },
    ),
  );
});

Deno.test("property: rename preserves array length", () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 20 }).filter((s) =>
        s.trim().length > 0
      ),
      fc.string({ minLength: 1, maxLength: 20 }).filter((s) =>
        s.trim().length > 0
      ),
      (original, newName) => {
        const items = createItem([], "01", original);
        const renamed = renameItem(items, "01", newName);
        assertEquals(renamed.length, items.length);
      },
    ),
  );
});

Deno.test("property: findItem always finds created items", () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 20 }).filter((s) =>
        s.trim().length > 0
      ),
      (name) => {
        const items = createItem([], "01", name);
        const found = findItem(items, "01");
        assertEquals(found.name, name);
      },
    ),
  );
});
