import { readFile } from 'node:fs/promises';
import { loadDotenv, readConfig, assertDeliverable } from './config.js';
import { createLogger } from './log.js';
import { fetchSource } from './rss.js';
import { selectNew } from './dedup.js';
import { createStateStore } from './state/index.js';
import { summarize } from './summarize.js';
import { composeDigest } from './compose.js';
import { sendMessages } from './telegram.js';

async function loadSources() {
  const url = new URL('../config/sources.json', import.meta.url);
  const raw = await readFile(url, 'utf8');
  const all = JSON.parse(raw);
  return all.filter((s) => s.enabled !== false);
}

/** Fetch every source concurrently; a failing feed is logged and skipped. */
async function fetchAll(sources, logger) {
  const results = await Promise.allSettled(sources.map((s) => fetchSource(s)));
  const records = [];
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      records.push(...r.value);
    } else {
      failed++;
      logger.warn(`source "${sources[i].id}" failed: ${r.reason?.message || r.reason}`);
    }
  });
  return { records, failed };
}

export async function runDigest() {
  const verbose = process.argv.includes('--verbose');
  const dryRun = process.argv.includes('--dry-run');
  await loadDotenv();
  const config = readConfig();
  const logger = createLogger({ verbose: verbose || dryRun });
  if (!dryRun) assertDeliverable(config); // dry-run needs no delivery creds

  const sources = await loadSources();
  logger.info(`loaded ${sources.length} enabled source(s)`);

  const { records, failed } = await fetchAll(sources, logger);
  logger.info(`fetched ${records.length} item(s), ${failed} source(s) failed`);

  const store = createStateStore(config);
  const seen = await store.loadSeen();

  let fresh = selectNew(records, seen);
  const freshCount = fresh.length;
  if (fresh.length > config.maxItemsPerRun) {
    fresh = fresh.slice(0, config.maxItemsPerRun);
  }

  if (fresh.length === 0) {
    logger.info('no new items');
    if (!config.sendWhenEmpty) {
      printSummary({ fetched: records.length, failed, fresh: 0, sent: 0 });
      return;
    }
  }

  const enriched = await summarize(fresh, config, logger);
  const messages = composeDigest(enriched, { timezone: config.digestTimezone });

  if (dryRun) {
    console.log(`\n----- DRY RUN: ${messages.length} message(s), nothing sent -----\n`);
    messages.forEach((m, i) => console.log(`--- message ${i + 1} ---\n${m}\n`));
    printSummary({ fetched: records.length, failed, fresh: freshCount, sent: 0 });
    return;
  }

  if (messages.length > 0) {
    await sendMessages(messages, config, logger);
    // Persist ONLY after a successful send: a delivery failure above throws and
    // leaves state untouched, so the items are retried next run (never lost).
    await store.markSent(fresh);
  }

  printSummary({ fetched: records.length, failed, fresh: freshCount, sent: fresh.length });
}

function printSummary({ fetched, failed, fresh, sent }) {
  console.log(
    `digest run: fetched=${fetched} failedSources=${failed} new=${fresh} sent=${sent}`,
  );
}

runDigest().catch((err) => {
  console.error(`[FATAL] ${err.message}`);
  process.exit(1);
});
