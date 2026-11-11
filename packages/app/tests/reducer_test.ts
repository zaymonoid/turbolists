import { assert, assertEquals } from "jsr:@std/assert@1";
import { appReducer } from "../src/store/reducer.ts";
import {
  type AppAction,
  type AppState,
  dataActionIds,
} from "../src/store/state.ts";
import { kitId, itemId, tripId } from "@turbolists/core/ids";

const item = itemId("charger");
const kit = kitId("essentials");
const trip = tripId("coast");
function initial(): AppState {
  return {
    view: "items",
    selectedTripId: trip,
    loadStatus: "ready",
    persistence: "saved",
    undo: null,
    data: {
      items: [{ id: item, name: "Charger" }],
      kits: [{ id: kit, name: "Essentials", itemIds: [item] }],
      trips: [{
        id: trip,
        name: "Coast",
        createdAt: "2026-11-10",
        kitIds: [kit],
        checked: new Set([item]),
      }],
    },
  };
}
const reduce = (state: AppState, action: AppAction) =>
  appReducer(state, action) ?? state;
const undo: AppAction = { id: "store/undo", data: {} };

Deno.test("undo restores an item, all kit references, and checked progress", () => {
  const original = initial();
  const deleted = reduce(original, { id: "item/delete", data: { id: item } });
  assertEquals(deleted.data.items, []);
  assertEquals(deleted.data.kits[0].itemIds, []);
  assertEquals(deleted.data.trips[0].checked.size, 0);
  const restored = reduce(deleted, undo);
  assertEquals(restored.data, original.data);
  assertEquals(restored.undo, null);
  assertEquals(reduce(restored, undo), restored);
});

Deno.test("undo survives tab changes and save acknowledgements without changing navigation", () => {
  let state = reduce(initial(), { id: "kit/delete", data: { id: kit } });
  state = reduce(state, { id: "nav/set-view", data: { view: "trips" } });
  state = reduce(state, { id: "store/save-status", data: { status: "saved" } });
  assert(state.undo);
  const restored = reduce(state, undo);
  assertEquals(restored.data, initial().data);
  assertEquals(restored.view, "trips");
});

Deno.test("editing invalidates undo so it cannot overwrite newer work", () => {
  let state = reduce(initial(), { id: "trip/delete", data: { id: trip } });
  state = reduce(state, {
    id: "item/rename",
    data: { id: item, name: "USB charger" },
  });
  assertEquals(state.undo, null);
  assertEquals(reduce(state, undo).data.items[0].name, "USB charger");
  assertEquals(reduce(state, undo).data.trips.length, 0);
});

Deno.test("a second destructive edit replaces the previous undo", () => {
  let state = reduce(initial(), { id: "item/delete", data: { id: item } });
  state = reduce(state, { id: "trip/delete", data: { id: trip } });
  const restored = reduce(state, undo);
  assertEquals(restored.data.trips.length, 1);
  assertEquals(restored.data.items.length, 0);
});

Deno.test("reset and item removal can be undone; dismissal and reload clear recovery", () => {
  for (
    const action of [
      { id: "trip/reset-checks", data: { tripId: trip } },
      { id: "kit/remove-item", data: { kitId: kit, itemId: item } },
    ] as const
  ) {
    const state = reduce(initial(), action);
    assert(state.undo);
    assertEquals(reduce(state, undo).data, initial().data);
    assertEquals(
      reduce(state, { id: "store/dismiss-undo", data: {} }).undo,
      null,
    );
    assertEquals(
      reduce(state, { id: "store/loaded", data: { store: initial().data } })
        .undo,
      null,
    );
  }
  assert(dataActionIds.includes("store/undo"));
});

Deno.test("archiving is reversible without losing checked progress", () => {
  const before = initial();
  const after = reduce(before, {
    id: "trip/set-archived",
    data: { id: trip, archived: true },
  });
  assertEquals(after.data.trips[0].archived, true);
  assertEquals(after.data.trips[0].checked, before.data.trips[0].checked);
  assertEquals(reduce(after, undo).data, before.data);
});
