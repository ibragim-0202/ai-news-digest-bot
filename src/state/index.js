import { createFileStore } from './file.js';
import { createSupabaseStore } from './supabase.js';

/**
 * Pick a state backend from config. Defaults to the file store so the bot runs
 * with zero external setup; opt into Supabase via STATE_BACKEND=supabase.
 */
export function createStateStore(config) {
  if (config.stateBackend === 'supabase') {
    return createSupabaseStore({ url: config.supabaseUrl, key: config.supabaseKey });
  }
  return createFileStore(config.statePath);
}
