/**
 * Returns a new array with duplicates removed, preserving the order
 * of first occurrence.
 */
export function uniqueById(ids: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}
