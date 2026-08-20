import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, formatItem, packSegments, composeDigest } from '../src/compose.js';

test('escapeHtml neutralizes markup characters', () => {
  assert.equal(escapeHtml('a & b <x> "q"'), 'a &amp; b &lt;x&gt; &quot;q&quot;');
});

test('formatItem renders link, summary and hashtags', () => {
  const block = formatItem({
    title: 'Model <2>',
    link: 'https://x/y',
    summary: 'Краткое описание',
    tags: ['ai', 'new model'],
  });
  assert.match(block, /<a href="https:\/\/x\/y">Model &lt;2&gt;<\/a>/);
  assert.match(block, /Краткое описание/);
  assert.match(block, /#ai #new_model/);
});

test('formatItem without link falls back to bold title, skips empty summary', () => {
  const block = formatItem({ title: 'T', link: '', summary: '', tags: [] });
  assert.equal(block, '• <b>T</b>');
});

test('packSegments keeps messages under the limit', () => {
  const segs = ['a'.repeat(30), 'b'.repeat(30), 'c'.repeat(30)];
  const msgs = packSegments(segs, 70); // two 30s + separator = 62 fits, third splits
  assert.equal(msgs.length, 2);
  for (const m of msgs) assert.ok(m.length <= 70);
});

test('packSegments hard-truncates an oversized single segment', () => {
  const msgs = packSegments(['x'.repeat(100)], 20);
  assert.equal(msgs.length, 1);
  assert.ok(msgs[0].length <= 20);
  assert.ok(msgs[0].endsWith('…'));
});

test('composeDigest returns empty array for no records', () => {
  assert.deepEqual(composeDigest([], { timezone: 'UTC' }), []);
});

test('composeDigest groups by source and renders deterministic date', () => {
  const now = new Date('2026-08-20T06:00:00Z');
  const records = [
    { sourceId: 's1', sourceTitle: 'Habr', title: 'A', link: 'l1', summary: '', tags: [] },
    { sourceId: 's1', sourceTitle: 'Habr', title: 'B', link: 'l2', summary: '', tags: [] },
    { sourceId: 's2', sourceTitle: 'Verge', title: 'C', link: 'l3', summary: '', tags: [] },
  ];
  const msgs = composeDigest(records, { timezone: 'Europe/Istanbul', now });
  const full = msgs.join('\n');
  assert.match(full, /20 августа 2026/);
  assert.match(full, /<b>Habr<\/b>/);
  assert.match(full, /<b>Verge<\/b>/);
});
