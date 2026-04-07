import type { Item } from "./item.ts";
import type { Facet } from "./facet.ts";
import type { Trip } from "./trip.ts";

export function tripChecklist(
  trip: Trip,
  facets: readonly Facet[],
): ReadonlySet<string> {
  const checklist = new Set<string>();
  const facetMap = new Map(facets.map((f) => [f.id, f]));
  for (const facetId of trip.facetIds) {
    const facet = facetMap.get(facetId);
    if (facet === undefined) continue; // graceful degradation for deleted facets
    for (const itemId of facet.itemIds) {
      checklist.add(itemId);
    }
  }
  return checklist;
}

export function packProgress(
  trip: Trip,
  facets: readonly Facet[],
): { readonly checked: number; readonly total: number } {
  const checklist = tripChecklist(trip, facets);
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
): ReadonlyMap<string, ReadonlySet<string>> {
  const usage = new Map<string, Set<string>>();
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
