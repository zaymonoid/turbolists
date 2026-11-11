import { invariant } from "./util/invariant.ts";
import { dedupe } from "./util/dedupe.ts";
import type { KitId, ItemId } from "./ids.ts";

export interface Kit {
  readonly id: KitId;
  readonly name: string;
  readonly itemIds: readonly ItemId[];
}

export function createKit(
  kits: readonly Kit[],
  id: KitId,
  name: string,
): readonly Kit[] {
  invariant(name.trim().length > 0, "Kit name must not be empty");
  invariant(
    !kits.some((f) => f.id === id),
    `Kit with id "${id}" already exists`,
  );
  return [...kits, { id, name, itemIds: [] }];
}

export function renameKit(
  kits: readonly Kit[],
  id: KitId,
  name: string,
): readonly Kit[] {
  invariant(name.trim().length > 0, "Kit name must not be empty");
  invariant(
    kits.some((f) => f.id === id),
    `Kit with id "${id}" not found`,
  );
  return kits.map((f) => (f.id === id ? { ...f, name } : f));
}

export function addItemToKit(
  kits: readonly Kit[],
  id: KitId,
  itemId: ItemId,
): readonly Kit[] {
  invariant(
    kits.some((f) => f.id === id),
    `Kit with id "${id}" not found`,
  );
  return kits.map((f) => {
    if (f.id !== id) return f;
    return { ...f, itemIds: dedupe([...f.itemIds, itemId]) };
  });
}

export function removeItemFromKit(
  kits: readonly Kit[],
  id: KitId,
  itemId: ItemId,
): readonly Kit[] {
  invariant(
    kits.some((f) => f.id === id),
    `Kit with id "${id}" not found`,
  );
  return kits.map((f) => {
    if (f.id !== id) return f;
    return { ...f, itemIds: f.itemIds.filter((iid) => iid !== itemId) };
  });
}

/** Moves an item to `toIndex` within the kit; the index is clamped. */
export function moveItemInKit(
  kits: readonly Kit[],
  id: KitId,
  itemId: ItemId,
  toIndex: number,
): readonly Kit[] {
  const kit = findKit(kits, id);
  invariant(
    kit.itemIds.includes(itemId),
    `Item "${itemId}" is not in kit "${id}"`,
  );
  const rest = kit.itemIds.filter((iid) => iid !== itemId);
  const index = Math.max(0, Math.min(rest.length, Math.trunc(toIndex)));
  const itemIds = [...rest.slice(0, index), itemId, ...rest.slice(index)];
  return kits.map((f) => (f.id === id ? { ...f, itemIds } : f));
}

export function deleteKit(
  kits: readonly Kit[],
  id: KitId,
): readonly Kit[] {
  invariant(
    kits.some((f) => f.id === id),
    `Kit with id "${id}" not found`,
  );
  return kits.filter((f) => f.id !== id);
}

export function findKit(kits: readonly Kit[], id: KitId): Kit {
  const kit = kits.find((f) => f.id === id);
  invariant(kit, `Kit with id "${id}" not found`);
  return kit;
}
