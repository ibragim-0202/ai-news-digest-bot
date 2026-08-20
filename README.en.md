# ai-news-digest-bot

[Русский](README.md) · **English**

A bot that, on a schedule, collects fresh IT/AI stories from several RSS
sources, runs each through an LLM (a one-line summary + tags), drops the ones
already sent, and posts a compact digest to Telegram.

Small, finished, no magic: the core logic is plain Node.js with unit tests;
external services (LLM, Telegram, database) are thin adapters around it.

---

## What it does

- Walks a list of RSS sources (`config/sources.json`) — editable without touching code.
- Normalizes items and **deduplicates** them by a stable key: the same news
  never arrives twice across runs.
- Asks an LLM (Claude) to compress each item into one sentence with 1–3 tags.
- Assembles a single digest, groups it by source and **splits it under the
  Telegram limit** (4096 chars) into several messages when needed.
- Sends it to a Telegram chat/channel on cron.

## How it works

```
RSS sources ──▶ fetch+normalize ──▶ dedup (vs. saved state)
                                          │
                                          ▼
                             LLM summaries (with fallback)
                                          │
                                          ▼
                     compose (group + split) ──▶ Telegram
                                          │
                          on send success ▼
                                  mark as sent (state)
```

Key ordering: **send first, mark as sent second.** If delivery fails the state
is untouched, so on the next run the items go out again rather than vanishing
silently.

## Engineering decisions

- **IO separated from logic.** The network (RSS, LLM, Telegram, Supabase) lives
  in thin adapters; normalization, dedup, digest assembly and limit-splitting
  are pure functions tested without a network. See `src/*.js` and `test/`.
- **No silent failures.** A failing RSS source is logged and skipped without
  taking down the run. A Telegram delivery failure, conversely, aborts the
  state write so no item is "lost".
- **Idempotency via state.** Dedup by the key `sourceId:(guid|link|title)`; two
  consecutive runs never send the same thing twice.
- **LLM degrades, not fails.** If the key is missing, the API is down or returns
  non-JSON, the digest still goes out (titles + links, no summaries).
- **Timezone.** The digest date is computed in `DIGEST_TIMEZONE`, not UTC.
- **Pluggable state backend.** File by default (zero dependencies), optionally
  Supabase (Postgres) behind a common `loadSeen` / `markSent` interface.

## Stack

Node.js 18 (ESM, built-in `fetch` and `node:test`) · `rss-parser` ·
Claude API (via `fetch`, no SDK) · Telegram Bot API · Supabase/Postgres (opt.) ·
Docker + busybox cron.

## Running

### Locally

```bash
npm install
cp .env.example .env    # fill in the tokens
npm test                # unit tests
node src/index.js --dry-run   # build and print the digest, sending nothing
npm start               # real run (needs Telegram tokens)
```

Environment variables — see `.env.example` (Telegram, Claude key, state backend,
timezone, per-run cap).

### Docker (scheduled)

```bash
cp .env.example .env    # fill in the tokens
docker compose up -d --build
docker compose logs -f
```

The container starts cron and runs the digest daily at 08:00 (timezone set via
`TZ`). Secrets are read from the mounted `.env`; the dedup state lives on the
`./state` volume and survives restarts. For an immediate run on start, set
`RUN_ON_START=true`.

### State in Supabase (optional)

```bash
# apply the schema in your Supabase project
psql "$SUPABASE_CONNECTION" -f sql/schema.sql
# then in .env:
# STATE_BACKEND=supabase
# SUPABASE_URL=...  SUPABASE_KEY=...
```

## Tests

`npm test` — unit tests over the pure logic: RSS normalization, dedup keys, the
file state store, LLM response validation/fallback, digest assembly and
Telegram-limit splitting, config parsing.

---

## My role

Designed and built the whole thing: the architecture (IO/logic split, pluggable
state backend), the data flows, edge-case handling, tests, the Docker/cron
wrapping. This is a portfolio project, not a commercial deployment; so it is
presented as-is, without invented metrics or "used in production" claims.

## Which AI tools I used

Built together with **Claude Code** (agentic coding): a context file and a spec
before the code, block-by-block assembly with meaningful commits, unit tests per
block, reviewing the result and rejecting some suggestions with a rationale. The
LLM step inside the product itself is the **Claude API** for summaries.

## What was hard / what I solved

- **Don't lose and don't duplicate.** The right "send → mark" ordering and a
  double dedup (within the run + against state) — so a delivery failure doesn't
  eat news and a rerun doesn't spam.
- **The LLM as an unreliable link.** The model sometimes wraps JSON in prose or
  returns garbage — the response is parsed defensively, with a guaranteed
  fallback to titles.
- **The Telegram limit.** A digest may not fit one message — I made a
  deterministic segment packing under 4096 chars, with tests.

## Out of scope (deliberately)

A web dashboard, full-text article parsing, personalization and subscriptions,
retry queues. Possible next steps: interleaving sources in the digest, webhooks
instead of polling, delivery metrics.

## License

MIT.
