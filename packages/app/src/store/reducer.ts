import { produce } from "immer";
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

export const appReducer: Reducer<AppState, AppAction> = (state, action) => {
  switch (action.id) {
    // Items
    case "item/create":
      return produce(state, (draft) => {
        draft.data.items = createItem(state.data.items, action.data.id, action.data.name);
      });
    case "item/rename":
      return produce(state, (draft) => {
        draft.data.items = renameItem(state.data.items, action.data.id, action.data.name);
      });
    case "item/delete":
      return produce(state, (draft) => {
        draft.data.items = deleteItem(state.data.items, action.data.id);
      });

    // Facets
    case "facet/create":
      return produce(state, (draft) => {
        draft.data.facets = createFacet(state.data.facets, action.data.id, action.data.name);
      });
    case "facet/rename":
      return produce(state, (draft) => {
        draft.data.facets = renameFacet(state.data.facets, action.data.id, action.data.name);
      });
    case "facet/delete":
      return produce(state, (draft) => {
        draft.data.facets = deleteFacet(state.data.facets, action.data.id);
      });
    case "facet/add-item":
      return produce(state, (draft) => {
        draft.data.facets = addItemToFacet(state.data.facets, action.data.facetId, action.data.itemId);
      });
    case "facet/remove-item":
      return produce(state, (draft) => {
        draft.data.facets = removeItemFromFacet(state.data.facets, action.data.facetId, action.data.itemId);
      });

    // Trips
    case "trip/create":
      return produce(state, (draft) => {
        draft.data.trips = createTrip(state.data.trips, action.data.id, action.data.name, action.data.createdAt);
      });
    case "trip/rename":
      return produce(state, (draft) => {
        draft.data.trips = renameTrip(state.data.trips, action.data.id, action.data.name);
      });
    case "trip/delete":
      return produce(state, (draft) => {
        draft.data.trips = deleteTrip(state.data.trips, action.data.id);
        if (state.selectedTripId === action.data.id) {
          draft.selectedTripId = null;
        }
      });
    case "trip/add-facet":
      return produce(state, (draft) => {
        draft.data.trips = addFacetToTrip(state.data.trips, action.data.tripId, action.data.facetId);
      });
    case "trip/remove-facet":
      return produce(state, (draft) => {
        draft.data.trips = removeFacetFromTrip(state.data.trips, action.data.tripId, action.data.facetId);
      });
    case "trip/toggle-checked":
      return produce(state, (draft) => {
        draft.data.trips = toggleChecked(state.data.trips, action.data.tripId, action.data.itemId);
      });
    case "trip/reset-checks":
      return produce(state, (draft) => {
        draft.data.trips = resetChecks(state.data.trips, action.data.tripId);
      });

    // Navigation
    case "nav/set-view":
      return produce(state, (draft) => {
        draft.view = action.data.view;
      });
    case "nav/select-trip":
      return produce(state, (draft) => {
        draft.selectedTripId = action.data.tripId;
      });

    // Persistence
    case "store/loaded":
      return produce(state, (draft) => {
        draft.data = action.data.store;
      });

    default:
      return undefined;
  }
};
