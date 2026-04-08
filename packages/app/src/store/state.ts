import type { Store } from "@turbolists/core/store";
import type { ItemId, FacetId, TripId } from "@turbolists/core/ids";
import type { Action } from "@zaymonoid/katha";

export interface AppState {
  readonly data: Store;
  readonly view: "trips" | "facets" | "items";
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
  | { id: "trip/rename"; data: { id: TripId; name: string } }
  | { id: "trip/delete"; data: { id: TripId } }
  | { id: "trip/add-facet"; data: { tripId: TripId; facetId: FacetId } }
  | { id: "trip/remove-facet"; data: { tripId: TripId; facetId: FacetId } }
  | { id: "trip/toggle-checked"; data: { tripId: TripId; itemId: ItemId } }
  | { id: "trip/reset-checks"; data: { tripId: TripId } }
  // Navigation
  | { id: "nav/set-view"; data: { view: AppState["view"] } }
  | { id: "nav/select-trip"; data: { tripId: TripId | null } }
  // Persistence
  | { id: "store/loaded"; data: { store: Store } };

/** Action IDs that mutate persisted data (used by the auto-save process). */
export const dataActionIds = [
  "item/create",
  "item/rename",
  "item/delete",
  "facet/create",
  "facet/rename",
  "facet/delete",
  "facet/add-item",
  "facet/remove-item",
  "trip/create",
  "trip/rename",
  "trip/delete",
  "trip/add-facet",
  "trip/remove-facet",
  "trip/toggle-checked",
  "trip/reset-checks",
] as const;
