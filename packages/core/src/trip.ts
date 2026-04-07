import { invariant } from "./util/invariant.ts";
import { uniqueById } from "./util/unique.ts";
import type { Facet } from "./facet.ts";

export interface Trip {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly facetIds: readonly string[];
  readonly checked: readonly string[];
}

export function createTrip(
  trips: readonly Trip[],
  id: string,
  name: string,
  createdAt: string,
): readonly Trip[] {
  invariant(name.trim().length > 0, "Trip name must not be empty");
  invariant(
    !trips.some((t) => t.id === id),
    `Trip with id "${id}" already exists`,
  );
  return [...trips, { id, name, createdAt, facetIds: [], checked: [] }];
}

export function addFacetToTrip(
  trips: readonly Trip[],
  tripId: string,
  facetId: string,
  facets: readonly Facet[],
): readonly Trip[] {
  invariant(
    trips.some((t) => t.id === tripId),
    `Trip with id "${tripId}" not found`,
  );
  invariant(
    facets.some((f) => f.id === facetId),
    `Facet with id "${facetId}" not found`,
  );
  return trips.map((t) => {
    if (t.id !== tripId) return t;
    return { ...t, facetIds: uniqueById([...t.facetIds, facetId]) };
  });
}

export function removeFacetFromTrip(
  trips: readonly Trip[],
  tripId: string,
  facetId: string,
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
  tripId: string,
  itemId: string,
): readonly Trip[] {
  invariant(
    trips.some((t) => t.id === tripId),
    `Trip with id "${tripId}" not found`,
  );
  return trips.map((t) => {
    if (t.id !== tripId) return t;
    const hasItem = t.checked.includes(itemId);
    const checked = hasItem
      ? t.checked.filter((id) => id !== itemId)
      : [...t.checked, itemId];
    return { ...t, checked };
  });
}

export function resetChecks(
  trips: readonly Trip[],
  tripId: string,
): readonly Trip[] {
  invariant(
    trips.some((t) => t.id === tripId),
    `Trip with id "${tripId}" not found`,
  );
  return trips.map((t) => (t.id === tripId ? { ...t, checked: [] } : t));
}

export function deleteTrip(
  trips: readonly Trip[],
  id: string,
): readonly Trip[] {
  invariant(
    trips.some((t) => t.id === id),
    `Trip with id "${id}" not found`,
  );
  return trips.filter((t) => t.id !== id);
}
