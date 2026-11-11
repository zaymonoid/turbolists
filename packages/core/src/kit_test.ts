import { assertEquals, assertThrows } from "@std/assert";
import * as fc from "fast-check";
import {
  addItemToKit,
  createKit,
  deleteKit,
  findKit,
  type Kit,
  moveItemInKit,
  removeItemFromKit,
  renameKit,
} from "./kit.ts";
import { itemId, kitId } from "./ids.ts";

const f1 = kitId("f1");
const f2 = kitId("f2");
const i1 = itemId("i1");
const i2 = itemId("i2");
const i3 = itemId("i3");

const arbName = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter((s) => s.trim().length > 0);

Deno.test("createKit - creates kit with empty itemIds", () => {
  const kits = createKit([], f1, "Trad Rack");
  assertEquals(kits.length, 1);
  assertEquals(kits[0].id, f1);
  assertEquals(kits[0].name, "Trad Rack");
  assertEquals(kits[0].itemIds, []);
});

Deno.test("createKit - appends to existing kits", () => {
  let kits: readonly Kit[] = [];
  kits = createKit(kits, f1, "Trad Rack");
  kits = createKit(kits, f2, "Camp Kitchen");
  assertEquals(kits.length, 2);
});

Deno.test("createKit - throws on empty name", () => {
  assertThrows(() => createKit([], f1, ""), Error, "Invariant violation");
});

Deno.test("createKit - throws on duplicate id", () => {
  const kits = createKit([], f1, "Trad Rack");
  assertThrows(
    () => createKit(kits, f1, "Camp Kitchen"),
    Error,
    "Invariant violation",
  );
});

Deno.test("renameKit - renames existing kit", () => {
  const kits = createKit([], f1, "Trad Rack");
  assertEquals(renameKit(kits, f1, "Sport Rack")[0].name, "Sport Rack");
});

Deno.test("renameKit - preserves itemIds", () => {
  let kits = createKit([], f1, "Trad Rack");
  kits = addItemToKit(kits, f1, i1);
  assertEquals(renameKit(kits, f1, "Sport Rack")[0].itemIds, [i1]);
});

Deno.test("renameKit - throws on missing kit", () => {
  assertThrows(
    () => renameKit([], f1, "New Name"),
    Error,
    "Invariant violation",
  );
});

Deno.test("renameKit - throws on empty name", () => {
  const kits = createKit([], f1, "Trad Rack");
  assertThrows(
    () => renameKit(kits, f1, ""),
    Error,
    "Invariant violation",
  );
});

Deno.test("addItemToKit - adds item to kit", () => {
  const kits = createKit([], f1, "Trad Rack");
  assertEquals(addItemToKit(kits, f1, i1)[0].itemIds, [i1]);
});

Deno.test("addItemToKit - adds multiple items preserving order", () => {
  let kits = createKit([], f1, "Trad Rack");
  kits = addItemToKit(kits, f1, i2);
  kits = addItemToKit(kits, f1, i1);
  assertEquals(kits[0].itemIds, [i2, i1]);
});

Deno.test("addItemToKit - idempotent (adding same item twice)", () => {
  let kits = createKit([], f1, "Trad Rack");
  kits = addItemToKit(kits, f1, i1);
  kits = addItemToKit(kits, f1, i1);
  assertEquals(kits[0].itemIds, [i1]);
});

Deno.test("addItemToKit - throws on nonexistent kit", () => {
  assertThrows(
    () => addItemToKit([], f1, i1),
    Error,
    "Invariant violation",
  );
});

Deno.test("addItemToKit - preserves other kits", () => {
  let kits: readonly Kit[] = [];
  kits = createKit(kits, f1, "Trad Rack");
  kits = createKit(kits, f2, "Camp Kitchen");
  kits = addItemToKit(kits, f1, i1);
  assertEquals(kits[1].itemIds, []);
});

Deno.test("removeItemFromKit - removes item", () => {
  let kits = createKit([], f1, "Trad Rack");
  kits = addItemToKit(kits, f1, i1);
  assertEquals(removeItemFromKit(kits, f1, i1)[0].itemIds, []);
});

Deno.test("removeItemFromKit - preserves other items and order", () => {
  let kits = createKit([], f1, "Trad Rack");
  kits = addItemToKit(kits, f1, i1);
  kits = addItemToKit(kits, f1, i2);
  kits = addItemToKit(kits, f1, i3);
  assertEquals(removeItemFromKit(kits, f1, i2)[0].itemIds, [i1, i3]);
});

Deno.test("removeItemFromKit - throws on nonexistent kit", () => {
  assertThrows(
    () => removeItemFromKit([], f1, i1),
    Error,
    "Invariant violation",
  );
});

Deno.test("removeItemFromKit - no-op for item not in kit", () => {
  const kits = createKit([], f1, "Trad Rack");
  assertEquals(removeItemFromKit(kits, f1, i1)[0].itemIds, []);
});

Deno.test("deleteKit - removes kit", () => {
  assertEquals(deleteKit(createKit([], f1, "Trad Rack"), f1).length, 0);
});

Deno.test("deleteKit - preserves other kits", () => {
  let kits: readonly Kit[] = [];
  kits = createKit(kits, f1, "Trad Rack");
  kits = createKit(kits, f2, "Camp Kitchen");
  const deleted = deleteKit(kits, f1);
  assertEquals(deleted.length, 1);
  assertEquals(deleted[0].name, "Camp Kitchen");
});

Deno.test("deleteKit - throws on missing kit", () => {
  assertThrows(() => deleteKit([], f1), Error, "Invariant violation");
});

Deno.test("findKit - finds existing kit", () => {
  assertEquals(findKit(createKit([], f1, "Trad Rack"), f1).name, "Trad Rack");
});

Deno.test("findKit - throws on missing kit", () => {
  assertThrows(() => findKit([], f1), Error, "Invariant violation");
});

// Property-based tests

Deno.test("property: add then remove item is identity on itemIds", () => {
  fc.assert(
    fc.property(arbName, (name) => {
      let kits = createKit([], f1, name);
      kits = addItemToKit(kits, f1, i1);
      kits = removeItemFromKit(kits, f1, i1);
      assertEquals(kits[0].itemIds, []);
    }),
  );
});

Deno.test("property: adding same item multiple times is idempotent", () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10 }), (count) => {
      let kits = createKit([], f1, "Test");
      for (let i = 0; i < count; i++) {
        kits = addItemToKit(kits, f1, i1);
      }
      assertEquals(kits[0].itemIds, [i1]);
    }),
  );
});

Deno.test("property: create N kits then delete all yields empty", () => {
  fc.assert(
    fc.property(
      fc.array(arbName, { minLength: 1, maxLength: 10 }),
      (names) => {
        let kits: readonly Kit[] = [];
        const ids = names.map((_, i) => kitId(`f-${i}`));
        for (let i = 0; i < names.length; i++) {
          kits = createKit(kits, ids[i], names[i]);
        }
        for (const id of ids) kits = deleteKit(kits, id);
        assertEquals(kits.length, 0);
      },
    ),
  );
});

Deno.test("moveItemInKit - moves an item to the target index", () => {
  const kits: Kit[] = [{ id: f1, name: "A", itemIds: [i1, i2, i3] }];
  assertEquals(moveItemInKit(kits, f1, i1, 2)[0].itemIds, [i2, i3, i1]);
  assertEquals(moveItemInKit(kits, f1, i3, 0)[0].itemIds, [i3, i1, i2]);
  assertEquals(moveItemInKit(kits, f1, i2, 1)[0].itemIds, [i1, i2, i3]);
});

Deno.test("moveItemInKit - clamps the index and leaves other kits alone", () => {
  const kits: Kit[] = [
    { id: f1, name: "A", itemIds: [i1, i2, i3] },
    { id: f2, name: "B", itemIds: [i1, i2] },
  ];
  const moved = moveItemInKit(kits, f1, i1, 99);
  assertEquals(moved[0].itemIds, [i2, i3, i1]);
  assertEquals(moved[1], kits[1]);
  assertEquals(moveItemInKit(kits, f1, i3, -4)[0].itemIds, [i3, i1, i2]);
});

Deno.test("moveItemInKit - throws when the item is not in the kit", () => {
  const kits: Kit[] = [{ id: f1, name: "A", itemIds: [i1] }];
  assertThrows(() => moveItemInKit(kits, f1, i2, 0), Error, "is not in kit");
  assertThrows(() => moveItemInKit(kits, f2, i1, 0), Error, "not found");
});

Deno.test("moveItemInKit - always yields a permutation with the item at the clamped index", () => {
  fc.assert(
    fc.property(
      fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1 }),
      fc.nat(),
      fc.integer({ min: -3, max: 40 }),
      (names, pick, toIndex) => {
        const ids = names.map((n) => itemId(n));
        const moving = ids[pick % ids.length];
        const result = moveItemInKit(
          [{ id: f1, name: "A", itemIds: ids }],
          f1,
          moving,
          toIndex,
        )[0]
          .itemIds;
        assertEquals([...result].sort(), [...ids].sort());
        assertEquals(
          result.indexOf(moving),
          Math.max(0, Math.min(ids.length - 1, toIndex)),
        );
        assertEquals(
          result.filter((id) => id !== moving),
          ids.filter((id) => id !== moving),
        );
      },
    ),
  );
});
