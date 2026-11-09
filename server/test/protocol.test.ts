import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_HISTORY, parseClientMessage } from '../../shared/protocol.ts';

test('accepts a history request', () => {
  assert.deepEqual(parseClientMessage('{"type":"history","ticker":"BTC-USD","limit":20}'), {
    type: 'history',
    ticker: 'BTC-USD',
    limit: 20,
  });
});

test('clamps the limit', () => {
  assert.equal(parseClientMessage('{"type":"history","ticker":"BTC-USD","limit":1e9}')?.limit, MAX_HISTORY);
  assert.equal(parseClientMessage('{"type":"history","ticker":"BTC-USD","limit":-5}')?.limit, 1);
});

test('rejects unknown types, raw SQL and bad input', () => {
  const bad = [
    '{"type":"query","sql":"DROP TABLE prices"}',
    '{"type":"history","ticker":"x\' OR 1=1 --","limit":20}',
    '{"type":"history","ticker":"BTC-USD","limit":"20"}',
    '{"type":"history","limit":20}',
    'SELECT * FROM prices',
    'null',
    '[]',
  ];
  for (const raw of bad) assert.equal(parseClientMessage(raw), null, raw);
});
