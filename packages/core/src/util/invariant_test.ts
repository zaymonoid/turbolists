import { assertEquals, assertThrows } from "@std/assert";
import { invariant } from "./invariant.ts";

Deno.test("invariant passes on truthy condition", () => {
  invariant(true, "should not throw");
  invariant(1, "should not throw");
  invariant("non-empty", "should not throw");
});

Deno.test("invariant throws on falsy condition", () => {
  assertThrows(
    () => invariant(false, "test message"),
    Error,
    "Invariant violation: test message",
  );
});

Deno.test("invariant throws on null", () => {
  assertThrows(
    () => invariant(null, "null check"),
    Error,
    "Invariant violation: null check",
  );
});

Deno.test("invariant throws on undefined", () => {
  assertThrows(
    () => invariant(undefined, "undefined check"),
    Error,
    "Invariant violation: undefined check",
  );
});

Deno.test("invariant narrows type", () => {
  const value: string | null = "hello";
  invariant(value !== null, "should be non-null");
  // After invariant, TypeScript knows value is string
  const len: number = value.length;
  assertEquals(len, 5);
});
