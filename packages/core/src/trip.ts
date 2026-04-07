import { invariant } from "./util/invariant.ts";
import type { Facet } from "./facet.ts";

export interface Trip {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly facetIds: ReadonlySet<string>;
  readonly checked: ReadonlySet<string>;
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
  return [...trips, {
    id,
    name,
    createdAt,
    facetIds: new Set(),
    checked: new Set(),
  }];
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
    const newFacetIds = new Set(t.facetIds);
    newFacetIds.add(facetId);
    return { ...t, facetIds: newFacetIds };
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
    const newFacetIds = new Set(t.facetIds);
    newFacetIds.delete(facetId);
    return { ...t, facetIds: newFacetIds };
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
    const newChecked = new Set(t.checked);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    return { ...t, checked: newChecked };
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
  return trips.map((t) =>
    t.id === tripId ? { ...t, checked: new Set() } : t
  );
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
