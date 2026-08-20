import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileStore } from '../src/state/file.js';

const rec = (k) => ({ itemKey: k });

test('file store: empty on first run, persists across reloads', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'digest-state-'));
  const path = join(dir, 'sent.json');
  try {
    const store = createFileStore(path);

    assert.deepEqual([...(await store.loadSeen())], []);

    await store.markSent([rec('a'), rec('b')]);
    assert.deepEqual([...(await store.loadSeen())].sort(), ['a', 'b']);

    // A fresh store instance reads the same persisted file.
    const store2 = createFileStore(path);
    await store2.markSent([rec('b'), rec('c')]); // 'b' idempotent
    assert.deepEqual([...(await store2.loadSeen())].sort(), ['a', 'b', 'c']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('file store: markSent with no records is a no-op', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'digest-state-'));
  const path = join(dir, 'sent.json');
  try {
    const store = createFileStore(path);
    await store.markSent([]);
    assert.deepEqual([...(await store.loadSeen())], []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
