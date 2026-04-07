import { facetId, itemId, tripId } from "./ids.ts";
import { dedupe } from "./util/dedupe.ts";
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

// --- Loading (JSON → domain) ---

export function loadStore(raw: unknown): Store {
  if (raw == null || typeof raw !== "object") {
    return emptyStore();
  }

  const data = raw as Record<string, unknown>;

  return {
    items: dedupeEntities(
      Array.isArray(data.items) ? data.items.map(loadItem) : [],
    ),
    facets: dedupeEntities(
      Array.isArray(data.facets) ? data.facets.map(loadFacet) : [],
    ),
    trips: dedupeEntities(
      Array.isArray(data.trips) ? data.trips.map(loadTrip) : [],
    ),
  };
}

function dedupeEntities<T extends { readonly id: string }>(
  entities: T[],
): T[] {
  const seen = new Set<string>();
  return entities.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function loadItem(raw: unknown): Item {
  const data = raw as Record<string, unknown>;
  const base: Item = {
    id: itemId(String(data.id ?? "")),
    name: String(data.name ?? ""),
  };
  if (data.notes !== undefined && data.notes !== null) {
    return { ...base, notes: String(data.notes) };
  }
  return base;
}

function loadFacet(raw: unknown): Facet {
  const data = raw as Record<string, unknown>;
  return {
    id: facetId(String(data.id ?? "")),
    name: String(data.name ?? ""),
    itemIds: dedupe(
      Array.isArray(data.itemIds)
        ? data.itemIds.map((v: unknown) => itemId(String(v)))
        : [],
    ),
  };
}

function loadTrip(raw: unknown): Trip {
  const data = raw as Record<string, unknown>;
  return {
    id: tripId(String(data.id ?? "")),
    name: String(data.name ?? ""),
    createdAt: String(data.createdAt ?? ""),
    facetIds: dedupe(
      Array.isArray(data.facetIds)
        ? data.facetIds.map((v: unknown) => facetId(String(v)))
        : [],
    ),
    checked: new Set(
      Array.isArray(data.checked)
        ? data.checked.map((v: unknown) => itemId(String(v)))
        : [],
    ),
  };
}

// --- Saving (domain → JSON) ---

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
    itemIds: facet.itemIds,
  };
}

function serializeTrip(trip: Trip): Record<string, unknown> {
  return {
    id: trip.id,
    name: trip.name,
    createdAt: trip.createdAt,
    facetIds: trip.facetIds,
    checked: [...trip.checked].sort(),
  };
}
