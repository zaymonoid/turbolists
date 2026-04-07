import type { Item } from "./item.ts";
import type { Facet } from "./facet.ts";
import type { Trip } from "./trip.ts";

export interface Store {
  readonly items: readonly Item[];
  readonly facets: readonly Facet[];
  readonly trips: readonly Trip[];
}

export function emptyStore(): Store {
  return { items: [], facets: [], trips: [] };
}

export function loadStore(raw: unknown): Store {
  if (raw == null || typeof raw !== "object") {
    return emptyStore();
  }

  const data = raw as Record<string, unknown>;

  const items: Item[] = Array.isArray(data.items)
    ? data.items.map(loadItem)
    : [];

  const facets: Facet[] = Array.isArray(data.facets)
    ? data.facets.map(loadFacet)
    : [];

  const trips: Trip[] = Array.isArray(data.trips)
    ? data.trips.map(loadTrip)
    : [];

  return { items, facets, trips };
}

function loadItem(raw: unknown): Item {
  const data = raw as Record<string, unknown>;
  const item: Item = {
    id: String(data.id ?? ""),
    name: String(data.name ?? ""),
  };
  if (data.notes !== undefined && data.notes !== null) {
    return { ...item, notes: String(data.notes) };
  }
  return item;
}

function loadFacet(raw: unknown): Facet {
  const data = raw as Record<string, unknown>;
  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? ""),
    itemIds: new Set(
      Array.isArray(data.itemIds) ? data.itemIds.map(String) : [],
    ),
  };
}

function loadTrip(raw: unknown): Trip {
  const data = raw as Record<string, unknown>;
  return {
    id: String(data.id ?? ""),
    name: String(data.name ?? ""),
    createdAt: String(data.createdAt ?? ""),
    facetIds: new Set(
      Array.isArray(data.facetIds) ? data.facetIds.map(String) : [],
    ),
    checked: new Set(
      Array.isArray(data.checked) ? data.checked.map(String) : [],
    ),
  };
}

export function storeToJson(store: Store): string {
  const serializable = {
    items: store.items.map(serializeItem),
    facets: store.facets.map(serializeFacet),
    trips: store.trips.map(serializeTrip),
  };
  return `${JSON.stringify(serializable, null, 2)}\n`;
}

function serializeItem(item: Item): Record<string, unknown> {
  const result: Record<string, unknown> = { id: item.id, name: item.name };
  if (item.notes !== undefined) {
    result.notes = item.notes;
  }
  return result;
}

function serializeFacet(facet: Facet): Record<string, unknown> {
  return {
    id: facet.id,
    name: facet.name,
    itemIds: [...facet.itemIds].sort(),
  };
}

function serializeTrip(trip: Trip): Record<string, unknown> {
  return {
    id: trip.id,
    name: trip.name,
    createdAt: trip.createdAt,
    facetIds: [...trip.facetIds].sort(),
    checked: [...trip.checked].sort(),
  };
}
