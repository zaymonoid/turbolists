import type { Store } from "@turbolists/core/store";
import type { FacetId, ItemId, TripId } from "@turbolists/core/ids";

export interface AppState {
  readonly data: Store;
  readonly view: "trips" | "facets" | "items";
  readonly loadStatus: "loading" | "ready" | "error";
  readonly persistence: "saved" | "error";
  readonly undo: { readonly data: Store; readonly message: string } | null;
  readonly selectedTripId: TripId | null;
}

export type AppAction =
  // Items
  | { id: "item/create"; data: { id: ItemId; name: string } }
  | { id: "item/rename"; data: { id: ItemId; name: string } }
  | { id: "item/delete"; data: { id: ItemId } }
  // Facets
  | { id: "facet/create"; data: { id: FacetId; name: string } }
  | { id: "facet/rename"; data: { id: FacetId; name: string } }
  | { id: "facet/delete"; data: { id: FacetId } }
  | { id: "facet/add-item"; data: { facetId: FacetId; itemId: ItemId } }
  | { id: "facet/remove-item"; data: { facetId: FacetId; itemId: ItemId } }
  // Trips
  | { id: "trip/create"; data: { id: TripId; name: string; createdAt: string } }
  | {
    id: "trip/duplicate";
    data: { sourceId: TripId; id: TripId; name: string; createdAt: string };
  }
  | { id: "trip/rename"; data: { id: TripId; name: string } }
  | { id: "trip/delete"; data: { id: TripId } }
  | { id: "trip/add-facet"; data: { tripId: TripId; facetId: FacetId } }
  | { id: "trip/remove-facet"; data: { tripId: TripId; facetId: FacetId } }
  | { id: "trip/toggle-checked"; data: { tripId: TripId; itemId: ItemId } }
  | { id: "trip/reset-checks"; data: { tripId: TripId } }
  | { id: "trip/set-archived"; data: { id: TripId; archived: boolean } }
  // Navigation
  | { id: "nav/set-view"; data: { view: AppState["view"] } }
  | { id: "nav/select-trip"; data: { tripId: TripId | null } }
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
  "facet/create",
  "facet/rename",
  "facet/delete",
  "facet/add-item",
  "facet/remove-item",
  "trip/create",
  "trip/set-archived",
  "trip/duplicate",
  "trip/rename",
  "trip/delete",
  "trip/add-facet",
  "trip/remove-facet",
  "trip/toggle-checked",
  "trip/reset-checks",
] as const;
