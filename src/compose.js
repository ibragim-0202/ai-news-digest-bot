export const TELEGRAM_LIMIT = 4096;

/** Escape the five characters that matter for Telegram HTML parse mode. */
export function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(now, timezone) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: timezone,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  }
}

/** One item rendered as an HTML block (title link, summary, tags). */
export function formatItem(rec) {
  const title = escapeHtml(rec.title);
  const head = rec.link ? `• <a href="${escapeHtml(rec.link)}">${title}</a>` : `• <b>${title}</b>`;
  const lines = [head];
  if (rec.summary) lines.push(`  ${escapeHtml(rec.summary)}`);
  if (rec.tags && rec.tags.length) {
    lines.push(`  ${rec.tags.map((t) => `#${escapeHtml(t.replace(/\s+/g, '_'))}`).join(' ')}`);
  }
  return lines.join('\n');
}

function groupBySource(records) {
  const order = [];
  const groups = new Map();
  for (const rec of records) {
    if (!groups.has(rec.sourceId)) {
      groups.set(rec.sourceId, { title: rec.sourceTitle, items: [] });
      order.push(rec.sourceId);
    }
    groups.get(rec.sourceId).items.push(rec);
  }
  return order.map((id) => groups.get(id));
}

/**
 * Greedily pack text segments into messages under `maxLen`, joining with a
 * blank line. A single oversized segment is hard-truncated so it can never
 * block delivery.
 */
export function packSegments(segments, maxLen = TELEGRAM_LIMIT) {
  const messages = [];
  let current = '';
  const sep = '\n\n';
  for (let seg of segments) {
    if (seg.length > maxLen) seg = seg.slice(0, maxLen - 1) + '…';
    if (!current) {
      current = seg;
    } else if (current.length + sep.length + seg.length <= maxLen) {
      current += sep + seg;
    } else {
      messages.push(current);
      current = seg;
    }
  }
  if (current) messages.push(current);
  return messages;
}

/**
 * Build the full digest as an array of Telegram-ready HTML messages. Pure:
 * `now` is injected so date rendering is deterministic in tests.
 */
export function composeDigest(records, { timezone, now = new Date(), maxLen = TELEGRAM_LIMIT } = {}) {
  if (records.length === 0) return [];
  const header = `📰 <b>AI/IT дайджест — ${formatDate(now, timezone)}</b>`;
  const segments = [header];
  for (const group of groupBySource(records)) {
    segments.push(`<b>${escapeHtml(group.title)}</b>\n` + group.items.map(formatItem).join('\n'));
  }
  return packSegments(segments, maxLen);
}
