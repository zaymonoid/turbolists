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
