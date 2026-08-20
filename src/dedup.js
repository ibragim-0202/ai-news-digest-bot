/**
 * Remove duplicates *within a single run* (e.g. the same story pulled from two
 * feeds under the same source key), keeping the first occurrence. Pure.
 */
export function dedupeWithin(records) {
  const seen = new Set();
  const out = [];
  for (const rec of records) {
    if (seen.has(rec.itemKey)) continue;
    seen.add(rec.itemKey);
    out.push(rec);
  }
  return out;
}

/**
 * Given all fetched records and the set of keys we've already sent in past
 * runs, return the fresh ones — deduped within the run and not previously sent.
 * Pure: the persistence layer only supplies `seenKeys`, so this is fully unit
 * testable with a plain Set.
 */
export function selectNew(records, seenKeys) {
  return dedupeWithin(records).filter((rec) => !seenKeys.has(rec.itemKey));
}
