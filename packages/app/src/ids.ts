import { ulid } from "ulidx";
import { itemId, kitId, tripId } from "@turbolists/core/ids";
import type { ItemId, KitId, TripId } from "@turbolists/core/ids";

export const newItemId = (): ItemId => itemId(ulid());
export const newKitId = (): KitId => kitId(ulid());
export const newTripId = (): TripId => tripId(ulid());
