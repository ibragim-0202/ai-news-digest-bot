const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Build the user prompt: a numbered list of items the model must summarize.
 * We index items so the response can be mapped back positionally, independent
 * of any id the model might mangle.
 */
export function buildUserPrompt(records) {
  const lines = records.map((r, i) => {
    const snippet = r.snippet ? ` — ${r.snippet}` : '';
    return `${i}. [${r.sourceTitle}] ${r.title}${snippet}`;
  });
  return (
    'Summarize each news item below in ONE short sentence (Russian), and give 1-3 short lowercase tags.\n' +
    'Reply with ONLY a JSON array, one object per item, no prose:\n' +
    '[{"i": <index>, "summary": "<one sentence>", "tags": ["tag1"]}]\n\n' +
    lines.join('\n')
  );
}

/**
 * Extract the first top-level JSON array from arbitrary model text. Models
 * sometimes wrap JSON in prose or code fences; this is defensive rather than
 * trusting. Returns null if nothing parseable is found.
 */
export function extractJsonArray(text) {
  if (typeof text !== 'string') return null;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Merge model output back onto records by index. Every record comes out
 * enriched: a valid entry contributes summary+tags, anything missing or
 * malformed falls back to no summary / no tags. No item is ever dropped.
 */
export function applySummaries(records, parsed) {
  const byIndex = new Map();
  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (!entry || typeof entry.i !== 'number') continue;
      const summary = typeof entry.summary === 'string' ? entry.summary.trim() : '';
      const tags = Array.isArray(entry.tags)
        ? entry.tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim())
        : [];
      byIndex.set(entry.i, { summary, tags });
    }
  }
  return records.map((rec, i) => {
    const extra = byIndex.get(i) || { summary: '', tags: [] };
    return { ...rec, summary: extra.summary, tags: extra.tags };
  });
}

/**
 * IO: call Claude to summarize records. On ANY failure (no key, network,
 * non-2xx, unparseable body) we log and return records with empty summaries —
 * the digest still goes out with titles + links.
 */
export async function summarize(records, config, logger = console) {
  if (records.length === 0) return [];
  if (!config.anthropicApiKey) {
    logger.warn('summarize: no ANTHROPIC_API_KEY, sending titles without summaries');
    return applySummaries(records, null);
  }
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.llmModel,
        max_tokens: 1024,
        messages: [{ role: 'user', content: buildUserPrompt(records) }],
      }),
    });
    if (!res.ok) {
      logger.warn(`summarize: LLM ${res.status}, falling back to titles`);
      return applySummaries(records, null);
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text ?? '';
    const parsed = extractJsonArray(text);
    if (!parsed) logger.warn('summarize: could not parse LLM JSON, falling back to titles');
    return applySummaries(records, parsed);
  } catch (err) {
    logger.warn(`summarize: LLM call failed (${err.message}), falling back to titles`);
    return applySummaries(records, null);
  }
}
