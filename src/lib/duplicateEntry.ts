/** Copy an entry for duplication — strips id, preserves all other fields. */
export function duplicateEntry<T extends { id: string }>(entry: T): Omit<T, 'id'> {
  const { id: _removed, ...rest } = entry;
  return rest;
}