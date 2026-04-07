import { assertEquals } from "@std/assert";
import * as fc from "fast-check";
import { dedupe } from "./dedupe.ts";

Deno.test("dedupe - empty array", () => {
  assertEquals(dedupe([]), []);
});

Deno.test("dedupe - no duplicates", () => {
  assertEquals(dedupe(["a", "b", "c"]), ["a", "b", "c"]);
});

Deno.test("dedupe - removes duplicates", () => {
  assertEquals(dedupe(["a", "b", "a", "c", "b"]), ["a", "b", "c"]);
});

Deno.test("dedupe - preserves first occurrence order", () => {
  assertEquals(dedupe(["c", "a", "b", "a", "c"]), ["c", "a", "b"]);
});

Deno.test("property: output has no duplicates and same unique set as input", () => {
  fc.assert(
    fc.property(
      fc.array(fc.string({ minLength: 1, maxLength: 5 })),
      (ids) => {
        const result = dedupe(ids);
        for (const id of result) {
          assertEquals(ids.includes(id), true);
        }
        assertEquals(new Set(result).size, result.length);
        assertEquals(new Set(result), new Set(ids));
      },
    ),
  );
});
