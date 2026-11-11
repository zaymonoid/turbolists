import { kitId, itemId, tripId } from "./ids.ts";
import { dedupe } from "./util/dedupe.ts";
import type { Item } from "./item.ts";
import type { Kit } from "./kit.ts";
import type { Trip } from "./trip.ts";

export interface Store {
  readonly items: readonly Item[];
  readonly kits: readonly Kit[];
  readonly trips: readonly Trip[];
}

export function emptyStore(): Store {
  return { items: [], kits: [], trips: [] };
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
    kits: dedupeEntities(
      Array.isArray(data.kits) ? data.kits.map(loadKit) : [],
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

function loadKit(raw: unknown): Kit {
  const data = raw as Record<string, unknown>;
  return {
    id: kitId(String(data.id ?? "")),
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
  const trip: Trip = {
    id: tripId(String(data.id ?? "")),
    name: String(data.name ?? ""),
    createdAt: String(data.createdAt ?? ""),
    kitIds: dedupe(
      Array.isArray(data.kitIds)
        ? data.kitIds.map((v: unknown) => kitId(String(v)))
        : [],
    ),
    checked: new Set(
      Array.isArray(data.checked)
        ? data.checked.map((v: unknown) => itemId(String(v)))
        : [],
    ),
  };
  return typeof data.archived === "boolean"
    ? { ...trip, archived: data.archived }
    : trip;
}

// --- Saving (domain → JSON) ---

export function storeToJson(store: Store): string {
  const serializable = {
    items: store.items.map(serializeItem),
    kits: store.kits.map(serializeKit),
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

function serializeKit(kit: Kit): Record<string, unknown> {
  return {
    id: kit.id,
    name: kit.name,
    itemIds: kit.itemIds,
  };
}

function serializeTrip(trip: Trip): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: trip.id,
    name: trip.name,
    createdAt: trip.createdAt,
    kitIds: trip.kitIds,
    checked: [...trip.checked].sort(),
  };
  if (trip.archived !== undefined) result.archived = trip.archived;
  return result;
}

/** Delete an item everywhere so kits and packing progress cannot retain dangling IDs. */
export function deleteStoreItem(store: Store, id: Item["id"]): Store {
  return {
    ...store,
    items: store.items.filter((item) => item.id !== id),
    kits: store.kits.map((kit) => ({
      ...kit,
      itemIds: kit.itemIds.filter((itemId) => itemId !== id),
    })),
    trips: store.trips.map((trip) => ({
      ...trip,
      checked: new Set([...trip.checked].filter((itemId) => itemId !== id)),
    })),
  };
}

/** Delete a kit from all trips while retaining the shared item library. */
export function deleteStoreKit(store: Store, id: Kit["id"]): Store {
  return {
    ...store,
    kits: store.kits.filter((kit) => kit.id !== id),
    trips: store.trips.map((trip) => ({
      ...trip,
      kitIds: trip.kitIds.filter((kitId) => kitId !== id),
    })),
  };
}
