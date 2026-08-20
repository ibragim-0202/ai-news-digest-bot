import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * File-backed state store. Zero external dependencies — the default backend,
 * ideal for local runs and demos. Stores a { keys: { itemKey: sentAtIso } } map.
 */
export function createFileStore(path = 'state/sent.json') {
  async function readAll() {
    try {
      const raw = await readFile(path, 'utf8');
      const data = JSON.parse(raw);
      return data && typeof data.keys === 'object' && data.keys ? data.keys : {};
    } catch (err) {
      if (err.code === 'ENOENT') return {}; // first run, no state yet
      throw err;
    }
  }

  return {
    async loadSeen() {
      return new Set(Object.keys(await readAll()));
    },
    async markSent(records) {
      if (records.length === 0) return;
      const keys = await readAll();
      const now = new Date().toISOString();
      for (const rec of records) keys[rec.itemKey] = now;
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify({ keys }, null, 2));
    },
  };
}
