import { invariant } from "./util/invariant.ts";
import { dedupe } from "./util/dedupe.ts";
import type { FacetId, ItemId, TripId } from "./ids.ts";

export interface Trip {
  readonly id: TripId;
  readonly name: string;
  readonly createdAt: string;
  readonly facetIds: readonly FacetId[];
  readonly archived?: boolean;
  readonly checked: ReadonlySet<ItemId>;
}

export function createTrip(
  trips: readonly Trip[],
  id: TripId,
  name: string,
  createdAt: string,
): readonly Trip[] {
  invariant(name.trim().length > 0, "Trip name must not be empty");
  invariant(
    !trips.some((t) => t.id === id),
    `Trip with id "${id}" already exists`,
  );
  return [...trips, {
    id,
    name,
    createdAt,
    facetIds: [],
    checked: new Set(),
  }];
}

/** Reuse a trip's facets without carrying over its packing progress. */
export function duplicateTrip(
  trips: readonly Trip[],
  sourceId: TripId,
  id: TripId,
  name: string,
  createdAt: string,
): readonly Trip[] {
  const source = trips.find((trip) => trip.id === sourceId);
  invariant(source, `Trip with id "${sourceId}" not found`);
  const result = createTrip(trips, id, name, createdAt);
  return result.map((trip) =>
    trip.id === id ? { ...trip, facetIds: [...source.facetIds] } : trip
  );
}

export function renameTrip(
  trips: readonly Trip[],
  id: TripId,
  name: string,
): readonly Trip[] {
  invariant(name.trim().length > 0, "Trip name must not be empty");
  invariant(
    trips.some((t) => t.id === id),
    `Trip with id "${id}" not found`,
  );
  return trips.map((t) => (t.id === id ? { ...t, name } : t));
}

export function addFacetToTrip(
  trips: readonly Trip[],
  tripId: TripId,
  facetId: FacetId,
): readonly Trip[] {
  invariant(
    trips.some((t) => t.id === tripId),
    `Trip with id "${tripId}" not found`,
  );
  return trips.map((t) => {
    if (t.id !== tripId) return t;
    return { ...t, facetIds: dedupe([...t.facetIds, facetId]) };
  });
}

export function removeFacetFromTrip(
  trips: readonly Trip[],
  tripId: TripId,
  facetId: FacetId,
): readonly Trip[] {
  invariant(
    trips.some((t) => t.id === tripId),
    `Trip with id "${tripId}" not found`,
  );
  return trips.map((t) => {
    if (t.id !== tripId) return t;
    return { ...t, facetIds: t.facetIds.filter((id) => id !== facetId) };
  });
}

export function toggleChecked(
  trips: readonly Trip[],
  tripId: TripId,
  itemId: ItemId,
): readonly Trip[] {
  invariant(
    trips.some((t) => t.id === tripId),
    `Trip with id "${tripId}" not found`,
  );
  return trips.map((t) => {
    if (t.id !== tripId) return t;
    const checked = new Set(t.checked);
    if (checked.has(itemId)) {
      checked.delete(itemId);
    } else {
      checked.add(itemId);
    }
    return { ...t, checked };
  });
}

export function resetChecks(
  trips: readonly Trip[],
  tripId: TripId,
): readonly Trip[] {
  invariant(
    trips.some((t) => t.id === tripId),
    `Trip with id "${tripId}" not found`,
  );
  return trips.map((t) => t.id === tripId ? { ...t, checked: new Set() } : t);
}

export function deleteTrip(
  trips: readonly Trip[],
  id: TripId,
): readonly Trip[] {
  invariant(
    trips.some((t) => t.id === id),
    `Trip with id "${id}" not found`,
  );
  return trips.filter((t) => t.id !== id);
}

/** Archiving changes organization only; packing progress and facets stay intact. */
export function setTripArchived(
  trips: readonly Trip[],
  id: TripId,
  archived: boolean,
): readonly Trip[] {
  invariant(
    trips.some((trip) => trip.id === id),
    `Trip with id "${id}" not found`,
  );
  return trips.map((trip) => trip.id === id ? { ...trip, archived } : trip);
}
