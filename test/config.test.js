import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig, assertDeliverable } from '../src/config.js';

test('readConfig applies defaults on an empty env', () => {
  const c = readConfig({});
  assert.equal(c.stateBackend, 'file');
  assert.equal(c.maxItemsPerRun, 15);
  assert.equal(c.digestTimezone, 'Europe/Istanbul');
  assert.equal(c.sendWhenEmpty, false);
});

test('readConfig parses overrides and booleans', () => {
  const c = readConfig({
    MAX_ITEMS_PER_RUN: '3',
    SEND_WHEN_EMPTY: 'TRUE',
    STATE_BACKEND: 'Supabase',
  });
  assert.equal(c.maxItemsPerRun, 3);
  assert.equal(c.sendWhenEmpty, true);
  assert.equal(c.stateBackend, 'supabase');
});

test('assertDeliverable throws listing every missing key', () => {
  assert.throws(() => assertDeliverable(readConfig({})), /TELEGRAM_BOT_TOKEN.*TELEGRAM_CHAT_ID/);
});

test('assertDeliverable passes when creds present', () => {
  const c = readConfig({ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '@c' });
  assert.doesNotThrow(() => assertDeliverable(c));
});
