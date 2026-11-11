import type { FacetId, ItemId } from "./ids.ts";
import type { Item } from "./item.ts";
import type { Facet } from "./facet.ts";
import type { Trip } from "./trip.ts";

/**
 * Merges item lists from the trip's selected facets, preserving
 * sub-ordering within each facet. Items appearing in multiple facets
 * are included at their first occurrence only.
 */
export function tripChecklist(
  trip: Trip,
  facets: readonly Facet[],
): readonly ItemId[] {
  const seen = new Set<ItemId>();
  const result: ItemId[] = [];
  const facetMap = new Map(facets.map((f) => [f.id, f]));
  for (const facetId of trip.facetIds) {
    const facet = facetMap.get(facetId);
    if (facet === undefined) continue;
    for (const itemId of facet.itemIds) {
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
  facets: readonly Facet[],
): { readonly checked: number; readonly total: number } {
  const checklist = new Set(tripChecklist(trip, facets));
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
  facets: readonly Facet[],
  items: readonly Item[],
): string {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const checklist = tripChecklist(trip, facets).flatMap((id) => {
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

export function facetUsage(
  facets: readonly Facet[],
  trips: readonly Trip[],
): ReadonlyMap<FacetId, number> {
  const usage = new Map<FacetId, number>();
  for (const facet of facets) {
    usage.set(facet.id, 0);
  }
  for (const trip of trips) {
    for (const facetId of trip.facetIds) {
      const count = usage.get(facetId);
      if (count !== undefined) {
        usage.set(facetId, count + 1);
      }
    }
  }
  return usage;
}

export function itemUsage(
  items: readonly Item[],
  facets: readonly Facet[],
): ReadonlyMap<ItemId, ReadonlySet<FacetId>> {
  const usage = new Map<ItemId, Set<FacetId>>();
  for (const item of items) {
    usage.set(item.id, new Set());
  }
  for (const facet of facets) {
    for (const itemId of facet.itemIds) {
      const set = usage.get(itemId);
      if (set !== undefined) {
        set.add(facet.id);
      }
    }
  }
  return usage;
}
