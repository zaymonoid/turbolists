import { invariant } from "./util/invariant.ts";
import { dedupe } from "./util/dedupe.ts";
import type { FacetId, ItemId } from "./ids.ts";

export interface Facet {
  readonly id: FacetId;
  readonly name: string;
  readonly itemIds: readonly ItemId[];
}

export function createFacet(
  facets: readonly Facet[],
  id: FacetId,
  name: string,
): readonly Facet[] {
  invariant(name.trim().length > 0, "Facet name must not be empty");
  invariant(
    !facets.some((f) => f.id === id),
    `Facet with id "${id}" already exists`,
  );
  return [...facets, { id, name, itemIds: [] }];
}

export function renameFacet(
  facets: readonly Facet[],
  id: FacetId,
  name: string,
): readonly Facet[] {
  invariant(name.trim().length > 0, "Facet name must not be empty");
  invariant(
    facets.some((f) => f.id === id),
    `Facet with id "${id}" not found`,
  );
  return facets.map((f) => (f.id === id ? { ...f, name } : f));
}

export function addItemToFacet(
  facets: readonly Facet[],
  id: FacetId,
  itemId: ItemId,
): readonly Facet[] {
  invariant(
    facets.some((f) => f.id === id),
    `Facet with id "${id}" not found`,
  );
  return facets.map((f) => {
    if (f.id !== id) return f;
    return { ...f, itemIds: dedupe([...f.itemIds, itemId]) };
  });
}

export function removeItemFromFacet(
  facets: readonly Facet[],
  id: FacetId,
  itemId: ItemId,
): readonly Facet[] {
  invariant(
    facets.some((f) => f.id === id),
    `Facet with id "${id}" not found`,
  );
  return facets.map((f) => {
    if (f.id !== id) return f;
    return { ...f, itemIds: f.itemIds.filter((iid) => iid !== itemId) };
  });
}

export function deleteFacet(
  facets: readonly Facet[],
  id: FacetId,
): readonly Facet[] {
  invariant(
    facets.some((f) => f.id === id),
    `Facet with id "${id}" not found`,
  );
  return facets.filter((f) => f.id !== id);
}

export function findFacet(facets: readonly Facet[], id: FacetId): Facet {
  const facet = facets.find((f) => f.id === id);
  invariant(facet, `Facet with id "${id}" not found`);
  return facet;
}
