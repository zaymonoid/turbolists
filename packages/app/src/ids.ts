import { ulid } from "ulidx";
import { itemId, facetId, tripId } from "@turbolists/core/ids";
import type { ItemId, FacetId, TripId } from "@turbolists/core/ids";

export const newItemId = (): ItemId => itemId(ulid());
export const newFacetId = (): FacetId => facetId(ulid());
export const newTripId = (): TripId => tripId(ulid());
