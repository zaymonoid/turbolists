import { invariant } from "./util/invariant.ts";
import type { ItemId } from "./ids.ts";

export interface Item {
  readonly id: ItemId;
  readonly name: string;
  readonly notes?: string;
}

export function createItem(
  items: readonly Item[],
  id: ItemId,
  name: string,
  notes?: string,
): readonly Item[] {
  invariant(name.trim().length > 0, "Item name must not be empty");
  invariant(
    !items.some((i) => i.id === id),
    `Item with id "${id}" already exists`,
  );
  const item: Item = notes !== undefined ? { id, name, notes } : { id, name };
  return [...items, item];
}

export function renameItem(
  items: readonly Item[],
  id: ItemId,
  name: string,
): readonly Item[] {
  invariant(name.trim().length > 0, "Item name must not be empty");
  invariant(
    items.some((i) => i.id === id),
    `Item with id "${id}" not found`,
  );
  return items.map((i) => (i.id === id ? { ...i, name } : i));
}

export function deleteItem(
  items: readonly Item[],
  id: ItemId,
): readonly Item[] {
  invariant(
    items.some((i) => i.id === id),
    `Item with id "${id}" not found`,
  );
  return items.filter((i) => i.id !== id);
}

export function findItem(items: readonly Item[], id: ItemId): Item {
  const item = items.find((i) => i.id === id);
  invariant(item, `Item with id "${id}" not found`);
  return item;
}
