import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeItem, makeItemKey } from '../src/rss.js';

const source = { id: 'habr-ai', title: 'Habr · AI' };

test('normalizeItem maps a well-formed item', () => {
  const rec = normalizeItem(
    {
      guid: 'https://example.com/a?id=1',
      link: 'https://example.com/a',
      title: '  New model released  ',
      isoDate: '2026-08-20T09:00:00.000Z',
      contentSnippet: 'Some   long   snippet\nwith newlines',
    },
    source,
  );
  assert.equal(rec.sourceId, 'habr-ai');
  assert.equal(rec.title, 'New model released');
  assert.equal(rec.link, 'https://example.com/a');
  assert.equal(rec.publishedAt, '2026-08-20T09:00:00.000Z');
  assert.equal(rec.snippet, 'Some long snippet with newlines');
  assert.equal(rec.itemKey, 'habr-ai:https://example.com/a?id=1');
});

test('itemKey prefers guid, then link, then title', () => {
  assert.equal(makeItemKey('s', { guid: 'G', link: 'L', title: 'T' }), 's:G');
  assert.equal(makeItemKey('s', { link: 'L', title: 'T' }), 's:L');
  assert.equal(makeItemKey('s', { title: 'T' }), 's:T');
});

test('missing title falls back to (untitled), missing date to null', () => {
  const rec = normalizeItem({ link: 'https://x/y' }, source);
  assert.equal(rec.title, '(untitled)');
  assert.equal(rec.publishedAt, null);
  assert.equal(rec.itemKey, 'habr-ai:https://x/y');
});

test('invalid date is dropped rather than propagated', () => {
  const rec = normalizeItem({ link: 'l', title: 't', pubDate: 'not-a-date' }, source);
  assert.equal(rec.publishedAt, null);
});

test('same article in two sources yields different keys', () => {
  const a = normalizeItem({ guid: 'X', title: 't' }, { id: 'src-a', title: 'A' });
  const b = normalizeItem({ guid: 'X', title: 't' }, { id: 'src-b', title: 'B' });
  assert.notEqual(a.itemKey, b.itemKey);
});
