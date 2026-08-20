import { readFile } from 'node:fs/promises';

/**
 * Minimal .env loader (Node 18 has no --env-file). Only sets keys that aren't
 * already in process.env, so real environment variables win over the file.
 * Ignores comments and blank lines; does not do shell-style interpolation.
 */
export async function loadDotenv(path = '.env') {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return; // no .env is fine (e.g. in Docker with real env)
    throw err;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** Read typed config from the environment, applying sensible defaults. */
export function readConfig(env = process.env) {
  return {
    telegramBotToken: env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: env.TELEGRAM_CHAT_ID || '',
    anthropicApiKey: env.ANTHROPIC_API_KEY || '',
    llmModel: env.LLM_MODEL || 'claude-haiku-4-5-20251001',
    stateBackend: (env.STATE_BACKEND || 'file').toLowerCase(),
    statePath: env.STATE_PATH || 'state/sent.json',
    supabaseUrl: env.SUPABASE_URL || '',
    supabaseKey: env.SUPABASE_KEY || '',
    maxItemsPerRun: Number.parseInt(env.MAX_ITEMS_PER_RUN || '15', 10),
    digestTimezone: env.DIGEST_TIMEZONE || 'Europe/Istanbul',
    sendWhenEmpty: (env.SEND_WHEN_EMPTY || 'false').toLowerCase() === 'true',
  };
}

/** Fail fast with a clear message if delivery credentials are missing. */
export function assertDeliverable(config) {
  const missing = [];
  if (!config.telegramBotToken) missing.push('TELEGRAM_BOT_TOKEN');
  if (!config.telegramChatId) missing.push('TELEGRAM_CHAT_ID');
  if (missing.length) {
    throw new Error(`Missing required config: ${missing.join(', ')}`);
  }
}
