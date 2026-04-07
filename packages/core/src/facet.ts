import { invariant } from "./util/invariant.ts";
import { uniqueById } from "./util/unique.ts";
import type { Item } from "./item.ts";

export interface Facet {
  readonly id: string;
  readonly name: string;
  readonly itemIds: readonly string[];
}

export function createFacet(
  facets: readonly Facet[],
  id: string,
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
  id: string,
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
  facetId: string,
  itemId: string,
  items: readonly Item[],
): readonly Facet[] {
  invariant(
    facets.some((f) => f.id === facetId),
    `Facet with id "${facetId}" not found`,
  );
  invariant(
    items.some((i) => i.id === itemId),
    `Item with id "${itemId}" not found`,
  );
  return facets.map((f) => {
    if (f.id !== facetId) return f;
    return { ...f, itemIds: uniqueById([...f.itemIds, itemId]) };
  });
}

export function removeItemFromFacet(
  facets: readonly Facet[],
  facetId: string,
  itemId: string,
): readonly Facet[] {
  invariant(
    facets.some((f) => f.id === facetId),
    `Facet with id "${facetId}" not found`,
  );
  return facets.map((f) => {
    if (f.id !== facetId) return f;
    return { ...f, itemIds: f.itemIds.filter((id) => id !== itemId) };
  });
}

export function deleteFacet(
  facets: readonly Facet[],
  id: string,
): readonly Facet[] {
  invariant(
    facets.some((f) => f.id === id),
    `Facet with id "${id}" not found`,
  );
  return facets.filter((f) => f.id !== id);
}

export function findFacet(facets: readonly Facet[], id: string): Facet {
  const facet = facets.find((f) => f.id === id);
  invariant(facet, `Facet with id "${id}" not found`);
  return facet;
}
