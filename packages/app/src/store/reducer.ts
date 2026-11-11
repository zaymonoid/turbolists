import { deleteStoreKit, deleteStoreItem } from "@turbolists/core/store";
import { castDraft, produce } from "immer";
import type { Reducer } from "@zaymonoid/katha";
import type { AppAction, AppState } from "./state.ts";
import { dataActionIds } from "./state.ts";
import { createItem, renameItem } from "@turbolists/core/item";
import {
  addItemToKit,
  createKit,
  moveItemInKit,
  removeItemFromKit,
  renameKit,
} from "@turbolists/core/kit";
import {
  addKitToTrip,
  createTrip,
  deleteTrip,
  duplicateTrip,
  removeKitFromTrip,
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

    // Kits
    case "kit/create":
      return produce(state, (draft) => {
        draft.data.kits = castDraft(
          createKit(state.data.kits, action.data.id, action.data.name),
        );
      });
    case "kit/rename":
      return produce(state, (draft) => {
        draft.data.kits = castDraft(
          renameKit(state.data.kits, action.data.id, action.data.name),
        );
      });
    case "kit/delete":
      return produce(state, (draft) => {
        draft.data = castDraft(deleteStoreKit(state.data, action.data.id));
        if (state.selectedKitId === action.data.id) {
          draft.selectedKitId = null;
        }
      });
    case "kit/add-item":
      return produce(state, (draft) => {
        draft.data.kits = castDraft(
          addItemToKit(
            state.data.kits,
            action.data.kitId,
            action.data.itemId,
          ),
        );
      });
    case "kit/remove-item":
      return produce(state, (draft) => {
        draft.data.kits = castDraft(
          removeItemFromKit(
            state.data.kits,
            action.data.kitId,
            action.data.itemId,
          ),
        );
      });
    case "kit/move-item":
      return produce(state, (draft) => {
        draft.data.kits = castDraft(
          moveItemInKit(
            state.data.kits,
            action.data.kitId,
            action.data.itemId,
            action.data.toIndex,
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
    case "trip/add-kit":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          addKitToTrip(
            state.data.trips,
            action.data.tripId,
            action.data.kitId,
          ),
        );
      });
    case "trip/remove-kit":
      return produce(state, (draft) => {
        draft.data.trips = castDraft(
          removeKitFromTrip(
            state.data.trips,
            action.data.tripId,
            action.data.kitId,
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
    case "nav/select-kit":
      return produce(state, (draft) => {
        draft.selectedKitId = action.data.kitId;
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
  "kit/delete": "Kit deleted",
  "trip/delete": "Trip deleted",
  "kit/remove-item": "Item removed from kit",
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
