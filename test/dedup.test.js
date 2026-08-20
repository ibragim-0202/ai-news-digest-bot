import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeWithin, selectNew } from '../src/dedup.js';

const rec = (k) => ({ itemKey: k, title: k });

test('dedupeWithin keeps first occurrence', () => {
  const out = dedupeWithin([rec('a'), rec('b'), rec('a'), rec('c'), rec('b')]);
  assert.deepEqual(out.map((r) => r.itemKey), ['a', 'b', 'c']);
});

test('selectNew drops already-seen keys', () => {
  const out = selectNew([rec('a'), rec('b'), rec('c')], new Set(['b']));
  assert.deepEqual(out.map((r) => r.itemKey), ['a', 'c']);
});

test('selectNew dedupes within run AND against seen', () => {
  const out = selectNew([rec('a'), rec('a'), rec('b')], new Set(['b']));
  assert.deepEqual(out.map((r) => r.itemKey), ['a']);
});

test('selectNew with empty seen returns all unique', () => {
  const out = selectNew([rec('a'), rec('b')], new Set());
  assert.deepEqual(out.map((r) => r.itemKey), ['a', 'b']);
});
