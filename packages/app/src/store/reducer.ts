import type { Reducer } from "@zaymonoid/katha";
import type { AppState, AppAction } from "./state.ts";
import { createItem, renameItem, deleteItem } from "@turbolists/core/item";
import {
  createFacet,
  renameFacet,
  deleteFacet,
  addItemToFacet,
  removeItemFromFacet,
} from "@turbolists/core/facet";
import {
  createTrip,
  renameTrip,
  deleteTrip,
  addFacetToTrip,
  removeFacetFromTrip,
  toggleChecked,
  resetChecks,
} from "@turbolists/core/trip";

function withData(
  state: AppState,
  update: Partial<AppState["data"]>,
): AppState {
  return { ...state, data: { ...state.data, ...update } };
}

export const appReducer: Reducer<AppState, AppAction> = (state, action) => {
  switch (action.id) {
    // Items
    case "item/create":
      return withData(state, {
        items: createItem(state.data.items, action.data.id, action.data.name),
      });
    case "item/rename":
      return withData(state, {
        items: renameItem(state.data.items, action.data.id, action.data.name),
      });
    case "item/delete":
      return withData(state, {
        items: deleteItem(state.data.items, action.data.id),
      });

    // Facets
    case "facet/create":
      return withData(state, {
        facets: createFacet(
          state.data.facets,
          action.data.id,
          action.data.name,
        ),
      });
    case "facet/rename":
      return withData(state, {
        facets: renameFacet(
          state.data.facets,
          action.data.id,
          action.data.name,
        ),
      });
    case "facet/delete":
      return withData(state, {
        facets: deleteFacet(state.data.facets, action.data.id),
      });
    case "facet/add-item":
      return withData(state, {
        facets: addItemToFacet(
          state.data.facets,
          action.data.facetId,
          action.data.itemId,
        ),
      });
    case "facet/remove-item":
      return withData(state, {
        facets: removeItemFromFacet(
          state.data.facets,
          action.data.facetId,
          action.data.itemId,
        ),
      });

    // Trips
    case "trip/create":
      return withData(state, {
        trips: createTrip(
          state.data.trips,
          action.data.id,
          action.data.name,
          action.data.createdAt,
        ),
      });
    case "trip/rename":
      return withData(state, {
        trips: renameTrip(state.data.trips, action.data.id, action.data.name),
      });
    case "trip/delete":
      return { ...withData(state, {
        trips: deleteTrip(state.data.trips, action.data.id),
      }), selectedTripId: state.selectedTripId === action.data.id ? null : state.selectedTripId };
    case "trip/add-facet":
      return withData(state, {
        trips: addFacetToTrip(
          state.data.trips,
          action.data.tripId,
          action.data.facetId,
        ),
      });
    case "trip/remove-facet":
      return withData(state, {
        trips: removeFacetFromTrip(
          state.data.trips,
          action.data.tripId,
          action.data.facetId,
        ),
      });
    case "trip/toggle-checked":
      return withData(state, {
        trips: toggleChecked(
          state.data.trips,
          action.data.tripId,
          action.data.itemId,
        ),
      });
    case "trip/reset-checks":
      return withData(state, {
        trips: resetChecks(state.data.trips, action.data.tripId),
      });

    // Navigation
    case "nav/set-view":
      return { ...state, view: action.data.view };
    case "nav/select-trip":
      return { ...state, selectedTripId: action.data.tripId };

    // Persistence
    case "store/loaded":
      return { ...state, data: action.data.store };

    default:
      return undefined;
  }
};
