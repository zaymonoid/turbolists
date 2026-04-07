/**
 * Returns a new array with duplicates removed, preserving the order
 * of first occurrence. Generic over branded string types.
 */
export function dedupe<T extends string>(ids: readonly T[]): readonly T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}
