import { assertEquals, assertThrows } from "@std/assert";
import * as fc from "fast-check";
import { createItem, deleteItem, findItem, type Item, renameItem } from "./item.ts";
import { itemId } from "./ids.ts";
import type { ItemId } from "./ids.ts";

const i1 = itemId("i1");
const i2 = itemId("i2");

const arbName = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0);

Deno.test("createItem - creates item with name", () => {
  const items = createItem([], i1, "Headlamp");
  assertEquals(items.length, 1);
  assertEquals(items[0], { id: i1, name: "Headlamp" });
});

Deno.test("createItem - creates item with notes", () => {
  const items = createItem([], i1, "Headlamp", "Black Diamond Spot");
  assertEquals(items[0], {
    id: i1,
    name: "Headlamp",
    notes: "Black Diamond Spot",
  });
});

Deno.test("createItem - appends to existing items", () => {
  let items: readonly Item[] = [];
  items = createItem(items, i1, "Headlamp");
  items = createItem(items, i2, "Harness");
  assertEquals(items.length, 2);
  assertEquals(items[0].name, "Headlamp");
  assertEquals(items[1].name, "Harness");
});

Deno.test("createItem - throws on empty name", () => {
  assertThrows(() => createItem([], i1, ""), Error, "Invariant violation");
});

Deno.test("createItem - throws on whitespace-only name", () => {
  assertThrows(() => createItem([], i1, "   "), Error, "Invariant violation");
});

Deno.test("createItem - throws on duplicate id", () => {
  const items = createItem([], i1, "Headlamp");
  assertThrows(
    () => createItem(items, i1, "Harness"),
    Error,
    "Invariant violation",
  );
});

Deno.test("renameItem - renames existing item", () => {
  const items = createItem([], i1, "Headlamp");
  const renamed = renameItem(items, i1, "LED Headlamp");
  assertEquals(renamed[0].name, "LED Headlamp");
});

Deno.test("renameItem - preserves other items", () => {
  let items: readonly Item[] = [];
  items = createItem(items, i1, "Headlamp");
  items = createItem(items, i2, "Harness");
  const renamed = renameItem(items, i1, "LED Headlamp");
  assertEquals(renamed.length, 2);
  assertEquals(renamed[0].name, "LED Headlamp");
  assertEquals(renamed[1].name, "Harness");
});

Deno.test("renameItem - preserves notes", () => {
  const items = createItem([], i1, "Headlamp", "my notes");
  const renamed = renameItem(items, i1, "LED Headlamp");
  assertEquals(renamed[0].notes, "my notes");
});

Deno.test("renameItem - throws on missing item", () => {
  assertThrows(
    () => renameItem([], i1, "Headlamp"),
    Error,
    "Invariant violation",
  );
});

Deno.test("renameItem - throws on empty name", () => {
  const items = createItem([], i1, "Headlamp");
  assertThrows(
    () => renameItem(items, i1, ""),
    Error,
    "Invariant violation",
  );
});

Deno.test("deleteItem - removes item", () => {
  const items = createItem([], i1, "Headlamp");
  assertEquals(deleteItem(items, i1).length, 0);
});

Deno.test("deleteItem - preserves other items", () => {
  let items: readonly Item[] = [];
  items = createItem(items, i1, "Headlamp");
  items = createItem(items, i2, "Harness");
  const deleted = deleteItem(items, i1);
  assertEquals(deleted.length, 1);
  assertEquals(deleted[0].name, "Harness");
});

Deno.test("deleteItem - throws on missing item", () => {
  assertThrows(() => deleteItem([], i1), Error, "Invariant violation");
});

Deno.test("findItem - finds existing item", () => {
  const items = createItem([], i1, "Headlamp");
  assertEquals(findItem(items, i1).name, "Headlamp");
});

Deno.test("findItem - throws on missing item", () => {
  assertThrows(() => findItem([], i1), Error, "Invariant violation");
});

// Property-based tests

Deno.test("property: create N items then delete in reverse yields empty", () => {
  fc.assert(
    fc.property(
      fc.array(arbName, { minLength: 1, maxLength: 10 }),
      (names) => {
        let items: readonly Item[] = [];
        const ids: ItemId[] = [];
        for (let i = 0; i < names.length; i++) {
          const id = itemId(`item-${i}`);
          ids.push(id);
          items = createItem(items, id, names[i]);
        }
        for (let i = ids.length - 1; i >= 0; i--) {
          items = deleteItem(items, ids[i]);
        }
        assertEquals(items.length, 0);
      },
    ),
  );
});

Deno.test("property: rename preserves array length", () => {
  fc.assert(
    fc.property(arbName, arbName, (original, newName) => {
      const items = createItem([], i1, original);
      assertEquals(renameItem(items, i1, newName).length, items.length);
    }),
  );
});

Deno.test("property: findItem always finds created items", () => {
  fc.assert(
    fc.property(arbName, (name) => {
      const items = createItem([], i1, name);
      assertEquals(findItem(items, i1).name, name);
    }),
  );
});
