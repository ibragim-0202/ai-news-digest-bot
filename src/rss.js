import Parser from 'rss-parser';

const parser = new Parser({ timeout: 15000 });

/**
 * Build a stable, source-scoped key for an item.
 * Preference order: guid > link > title. Scoping by sourceId means the same
 * article syndicated to two feeds is still deduped per source (and, in
 * practice, guid/link collisions across sources cannot silently merge items).
 */
export function makeItemKey(sourceId, { guid, link, title }) {
  const basis = (guid || link || title || '').trim();
  return `${sourceId}:${basis}`;
}

/**
 * Turn a raw rss-parser item into our normalized record. Pure and defensive:
 * missing fields degrade gracefully instead of throwing, so one malformed
 * entry never takes down a whole feed.
 */
export function normalizeItem(raw, source) {
  const guid = typeof raw.guid === 'string' ? raw.guid : undefined;
  const link = typeof raw.link === 'string' ? raw.link.trim() : '';
  const title = (typeof raw.title === 'string' ? raw.title : '').trim() || '(untitled)';

  const rawDate = raw.isoDate || raw.pubDate || null;
  let publishedAt = null;
  if (rawDate) {
    const d = new Date(rawDate);
    if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
  }

  const snippet = (raw.contentSnippet || raw.summary || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  return {
    itemKey: makeItemKey(source.id, { guid, link, title }),
    sourceId: source.id,
    sourceTitle: source.title,
    title,
    link,
    publishedAt,
    snippet,
  };
}

/**
 * Fetch and normalize one source. Network/parse errors are surfaced to the
 * caller as a rejected promise so the orchestrator can log-and-skip per source
 * without aborting the whole run.
 */
export async function fetchSource(source) {
  const feed = await parser.parseURL(source.url);
  const items = Array.isArray(feed.items) ? feed.items : [];
  return items.map((raw) => normalizeItem(raw, source));
}
