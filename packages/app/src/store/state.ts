import type { Store } from "@turbolists/core/store";
import type { KitId, ItemId, TripId } from "@turbolists/core/ids";

export interface AppState {
  readonly data: Store;
  readonly view: "trips" | "kits" | "items";
  readonly loadStatus: "loading" | "ready" | "error";
  readonly persistence: "saved" | "error";
  readonly undo: { readonly data: Store; readonly message: string } | null;
  readonly selectedTripId: TripId | null;
  readonly selectedKitId: KitId | null;
}

export type AppAction =
  // Items
  | { id: "item/create"; data: { id: ItemId; name: string } }
  | { id: "item/rename"; data: { id: ItemId; name: string } }
  | { id: "item/delete"; data: { id: ItemId } }
  // Kits
  | { id: "kit/create"; data: { id: KitId; name: string } }
  | { id: "kit/rename"; data: { id: KitId; name: string } }
  | { id: "kit/delete"; data: { id: KitId } }
  | { id: "kit/add-item"; data: { kitId: KitId; itemId: ItemId } }
  | { id: "kit/remove-item"; data: { kitId: KitId; itemId: ItemId } }
  | {
    id: "kit/move-item";
    data: { kitId: KitId; itemId: ItemId; toIndex: number };
  }
  // Trips
  | { id: "trip/create"; data: { id: TripId; name: string; createdAt: string } }
  | {
    id: "trip/duplicate";
    data: { sourceId: TripId; id: TripId; name: string; createdAt: string };
  }
  | { id: "trip/rename"; data: { id: TripId; name: string } }
  | { id: "trip/delete"; data: { id: TripId } }
  | { id: "trip/add-kit"; data: { tripId: TripId; kitId: KitId } }
  | { id: "trip/remove-kit"; data: { tripId: TripId; kitId: KitId } }
  | { id: "trip/toggle-checked"; data: { tripId: TripId; itemId: ItemId } }
  | { id: "trip/reset-checks"; data: { tripId: TripId } }
  | { id: "trip/set-archived"; data: { id: TripId; archived: boolean } }
  // Navigation
  | { id: "nav/set-view"; data: { view: AppState["view"] } }
  | { id: "nav/select-trip"; data: { tripId: TripId | null } }
  | { id: "nav/select-kit"; data: { kitId: KitId | null } }
  // Recovery
  | { id: "store/undo"; data: {} }
  | { id: "store/dismiss-undo"; data: {} }
  // Persistence
  | { id: "store/load-failed"; data: {} }
  | { id: "store/save-status"; data: { status: "saved" | "error" } }
  | { id: "store/retry-save"; data: {} }
  | { id: "store/loaded"; data: { store: Store } };

/** Action IDs that mutate persisted data (used by the auto-save process). */
export const dataActionIds = [
  "store/undo",
  "item/create",
  "item/rename",
  "item/delete",
  "kit/create",
  "kit/rename",
  "kit/delete",
  "kit/add-item",
  "kit/remove-item",
  "kit/move-item",
  "trip/create",
  "trip/set-archived",
  "trip/duplicate",
  "trip/rename",
  "trip/delete",
  "trip/add-kit",
  "trip/remove-kit",
  "trip/toggle-checked",
  "trip/reset-checks",
] as const;
