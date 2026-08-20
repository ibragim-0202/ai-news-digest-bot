/**
 * Supabase-backed state store using the PostgREST HTTP API directly (no SDK
 * dependency). Expects a table:
 *
 *   create table sent_items (
 *     item_key text primary key,
 *     sent_at  timestamptz not null default now()
 *   );
 *
 * loadSeen() pulls the most recent N keys instead of encoding item keys into a
 * query filter — item keys can contain commas/parentheses that would break a
 * PostgREST `in.(...)` filter, so we filter locally against the fetched set.
 */
export function createSupabaseStore({ url, key, table = 'sent_items', window = 2000 }) {
  if (!url || !key) {
    throw new Error('Supabase backend requires SUPABASE_URL and SUPABASE_KEY');
  }
  const base = `${url.replace(/\/$/, '')}/rest/v1/${table}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  return {
    async loadSeen() {
      const res = await fetch(
        `${base}?select=item_key&order=sent_at.desc&limit=${window}`,
        { headers },
      );
      if (!res.ok) {
        throw new Error(`Supabase loadSeen failed: ${res.status} ${await res.text()}`);
      }
      const rows = await res.json();
      return new Set(rows.map((r) => r.item_key));
    },
    async markSent(records) {
      if (records.length === 0) return;
      const now = new Date().toISOString();
      const body = records.map((rec) => ({ item_key: rec.itemKey, sent_at: now }));
      const res = await fetch(base, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Supabase markSent failed: ${res.status} ${await res.text()}`);
      }
    },
  };
}
