import { deleteStoreFacet, deleteStoreItem } from "@turbolists/core/store";
import { castDraft, produce } from "immer";
import type { Reducer } from "@zaymonoid/katha";
import type { AppAction, AppState } from "./state.ts";
import { dataActionIds } from "./state.ts";
import { createItem, renameItem } from "@turbolists/core/item";
import {
  addItemToFacet,
  createFacet,
  removeItemFromFacet,
  renameFacet,
} from "@turbolists/core/facet";
import {
  addFacetToTrip,
  createTrip,
  deleteTrip,
  duplicateTrip,
  removeFacetFromTrip,
  renameTrip,
  resetChecks,
  setTripArchived,
  toggleChecked,
} from "@turbolists/core/trip";

const reduceAction: Reducer<AppState, AppAction> = (state, action) => {
  switch (action.id) {
    // Items
    case "item/create":
      return produce(state, (draft) => {
        draft.data.items = castDraft(
          createItem(state.data.items, action.data.id, action.data.name),
        );
      });
    case "item/rename":
      return produce(state, (draft) => {
        draft.data.items = castDraft(
          renameItem(state.data.items, action.data.id, action.data.name),
        );
      });
    case "item/delete":
      return produce(state, (draft) => {
        draft.data = castDraft(deleteStoreItem(state.data, action.data.id));
      });

    // Facets
    case "facet/create":
      return produce(state, (draft) => {
        draft.data.facets = castDraft(
          createFacet(state.data.facets, action.data.id, action.data.name),
        );
      });
    case "facet/rename":
      return produce(state, (draft) => {
        draft.data.facets = castDraft(
          renameFacet(state.data.facets, action.data.id, action.data.name),
        );
      });
    case "facet/delete":
      return produce(state, (draft) => {
        draft.data = castDraft(deleteStoreFacet(state.data, action.data.id));
      });
    case "facet/add-item":
      return produce(state, (draft) => {
        draft.data.facets = castDraft(
          addItemToFacet(
            state.data.facets,
            action.data.facetId,
            action.data.itemId,
          ),
        );
      });
    case "facet/remove-item":
      return produce(state, (draft) => {
        draft.data.facets = castDraft(
          removeItemFromFacet(
            state.data.facets,
            action.data.facetId,
            action.data.itemId,
          ),
        );
      });

    // Trips
    case "trip/create":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          createTrip(
            state.data.trips,
            action.data.id,
            action.data.name,
            action.data.createdAt,
          ),
        );
      });
    case "trip/duplicate":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          duplicateTrip(
            state.data.trips,
            action.data.sourceId,
            action.data.id,
            action.data.name,
            action.data.createdAt,
          ),
        );
      });
    case "trip/set-archived":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          setTripArchived(
            state.data.trips,
            action.data.id,
            action.data.archived,
          ),
        );
      });
    case "trip/rename":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          renameTrip(state.data.trips, action.data.id, action.data.name),
        );
      });
    case "trip/delete":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          deleteTrip(state.data.trips, action.data.id),
        );
        if (state.selectedTripId === action.data.id) {
          draft.selectedTripId = null;
        }
      });
    case "trip/add-facet":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          addFacetToTrip(
            state.data.trips,
            action.data.tripId,
            action.data.facetId,
          ),
        );
      });
    case "trip/remove-facet":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          removeFacetFromTrip(
            state.data.trips,
            action.data.tripId,
            action.data.facetId,
          ),
        );
      });
    case "trip/toggle-checked":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          toggleChecked(
            state.data.trips,
            action.data.tripId,
            action.data.itemId,
          ),
        );
      });
    case "trip/reset-checks":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          resetChecks(state.data.trips, action.data.tripId),
        );
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

    // Recovery
    case "store/undo":
      if (!state.undo) return state;
      return produce(state, (draft) => {
        draft.data = castDraft(state.undo!.data);
        draft.undo = null;
      });
    case "store/dismiss-undo":
      return produce(state, (draft) => {
        draft.undo = null;
      });

    // Persistence
    case "store/load-failed":
      return produce(state, (draft) => {
        draft.loadStatus = "error";
      });
    case "store/save-status":
      return produce(state, (draft) => {
        draft.persistence = action.data.status;
      });
    case "store/loaded":
      return produce(state, (draft) => {
        draft.data = castDraft(action.data.store);
        draft.loadStatus = "ready";
        draft.undo = null;
      });

    default:
      return undefined;
  }
};

const undoMessages: Partial<Record<AppAction["id"], string>> = {
  "item/delete": "Item deleted",
  "facet/delete": "Facet deleted",
  "trip/delete": "Trip deleted",
  "facet/remove-item": "Item removed from facet",
  "trip/reset-checks": "Packing progress reset",
};
const mutations = new Set<string>(dataActionIds);

/** One-step recovery is invalidated by the next edit, never by navigation. */
export const appReducer: Reducer<AppState, AppAction> = (state, action) => {
  const next = reduceAction(state, action);
  if (!next || action.id === "store/undo" || !mutations.has(action.id)) {
    return next;
  }
  const message = action.id === "trip/set-archived"
    ? (action.data.archived ? "Trip archived" : "Trip restored")
    : undoMessages[action.id];
  return produce(next, (draft) => {
    draft.undo = message ? { data: castDraft(state.data), message } : null;
  });
};
