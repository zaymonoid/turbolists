import { assertEquals } from "@std/assert";
import * as fc from "fast-check";
import { uniqueById } from "./unique.ts";

Deno.test("uniqueById - empty array", () => {
  assertEquals(uniqueById([]), []);
});

Deno.test("uniqueById - no duplicates", () => {
  assertEquals(uniqueById(["a", "b", "c"]), ["a", "b", "c"]);
});

Deno.test("uniqueById - removes duplicates", () => {
  assertEquals(uniqueById(["a", "b", "a", "c", "b"]), ["a", "b", "c"]);
});

Deno.test("uniqueById - preserves first occurrence order", () => {
  assertEquals(uniqueById(["c", "a", "b", "a", "c"]), ["c", "a", "b"]);
});

Deno.test("property: output is subset of input in same order", () => {
  fc.assert(
    fc.property(
      fc.array(fc.string({ minLength: 1, maxLength: 5 })),
      (ids) => {
        const result = uniqueById(ids);
        // Every element in result appears in ids
        for (const id of result) {
          assertEquals(ids.includes(id), true);
        }
        // No duplicates in result
        assertEquals(new Set(result).size, result.length);
        // Same set of unique values
        assertEquals(new Set(result), new Set(ids));
      },
    ),
  );
});
