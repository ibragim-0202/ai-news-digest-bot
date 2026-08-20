import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUserPrompt, extractJsonArray, applySummaries } from '../src/summarize.js';

const recs = [
  { itemKey: 'a', title: 'Title A', sourceTitle: 'Src', snippet: 'snip a' },
  { itemKey: 'b', title: 'Title B', sourceTitle: 'Src', snippet: '' },
];

test('buildUserPrompt numbers items and includes titles', () => {
  const p = buildUserPrompt(recs);
  assert.match(p, /0\. \[Src\] Title A — snip a/);
  assert.match(p, /1\. \[Src\] Title B/);
});

test('extractJsonArray pulls array out of fenced / prose-wrapped text', () => {
  const text = 'Here you go:\n```json\n[{"i":0,"summary":"s","tags":["t"]}]\n```';
  assert.deepEqual(extractJsonArray(text), [{ i: 0, summary: 's', tags: ['t'] }]);
});

test('extractJsonArray returns null on garbage', () => {
  assert.equal(extractJsonArray('not json at all'), null);
  assert.equal(extractJsonArray('{"i":0}'), null); // object, not array
});

test('applySummaries maps valid entries and cleans tags', () => {
  const parsed = [{ i: 0, summary: '  hello ', tags: [' ai ', '', 5, 'ml'] }];
  const out = applySummaries(recs, parsed);
  assert.equal(out[0].summary, 'hello');
  assert.deepEqual(out[0].tags, ['ai', 'ml']);
});

test('applySummaries falls back for missing/invalid entries — no item dropped', () => {
  const out = applySummaries(recs, [{ i: 0, summary: 's', tags: ['x'] }]);
  assert.equal(out.length, 2);
  assert.equal(out[1].summary, ''); // index 1 had no entry
  assert.deepEqual(out[1].tags, []);
});

test('applySummaries with null parsed enriches everything empty', () => {
  const out = applySummaries(recs, null);
  assert.deepEqual(out.map((r) => r.summary), ['', '']);
  assert.equal(out.length, 2);
});
