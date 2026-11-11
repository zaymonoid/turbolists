import type { KitId, ItemId } from "./ids.ts";
import type { Item } from "./item.ts";
import type { Kit } from "./kit.ts";
import type { Trip } from "./trip.ts";

/**
 * Merges item lists from the trip's selected kits, preserving
 * sub-ordering within each kit. Items appearing in multiple kits
 * are included at their first occurrence only.
 */
export function tripChecklist(
  trip: Trip,
  kits: readonly Kit[],
): readonly ItemId[] {
  const seen = new Set<ItemId>();
  const result: ItemId[] = [];
  const kitMap = new Map(kits.map((f) => [f.id, f]));
  for (const kitId of trip.kitIds) {
    const kit = kitMap.get(kitId);
    if (kit === undefined) continue;
    for (const itemId of kit.itemIds) {
      if (!seen.has(itemId)) {
        seen.add(itemId);
        result.push(itemId);
      }
    }
  }
  return result;
}

export function packProgress(
  trip: Trip,
  kits: readonly Kit[],
): { readonly checked: number; readonly total: number } {
  const checklist = new Set(tripChecklist(trip, kits));
  let checked = 0;
  for (const itemId of trip.checked) {
    if (checklist.has(itemId)) {
      checked++;
    }
  }
  return { checked, total: checklist.size };
}

/** A portable checklist, independent of the current search or unpacked filter. */
export function formatTripChecklist(
  trip: Trip,
  kits: readonly Kit[],
  items: readonly Item[],
): string {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const checklist = tripChecklist(trip, kits).flatMap((id) => {
    const item = itemMap.get(id);
    return item ? [item] : [];
  });
  const checked = checklist.filter((item) => trip.checked.has(item.id)).length;
  const lines = checklist.map((item) => {
    const name = item.name.replace(/\s+/g, " ").trim();
    const notes = item.notes?.trim().split(/\r?\n/).map((line) => `    ${line}`)
      .join("\n");
    return `- [${trip.checked.has(item.id) ? "x" : " "}] ${name}${
      notes ? `\n${notes}` : ""
    }`;
  });
  return [trip.name, `${checked} of ${checklist.length} packed`, "", ...lines]
    .join("\n").trimEnd();
}

export function kitUsage(
  kits: readonly Kit[],
  trips: readonly Trip[],
): ReadonlyMap<KitId, number> {
  const usage = new Map<KitId, number>();
  for (const kit of kits) {
    usage.set(kit.id, 0);
  }
  for (const trip of trips) {
    for (const kitId of trip.kitIds) {
      const count = usage.get(kitId);
      if (count !== undefined) {
        usage.set(kitId, count + 1);
      }
    }
  }
  return usage;
}

export function itemUsage(
  items: readonly Item[],
  kits: readonly Kit[],
): ReadonlyMap<ItemId, ReadonlySet<KitId>> {
  const usage = new Map<ItemId, Set<KitId>>();
  for (const item of items) {
    usage.set(item.id, new Set());
  }
  for (const kit of kits) {
    for (const itemId of kit.itemIds) {
      const set = usage.get(itemId);
      if (set !== undefined) {
        set.add(kit.id);
      }
    }
  }
  return usage;
}
