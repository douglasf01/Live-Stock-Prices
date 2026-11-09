import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import protobufjs from 'protobufjs';
import { loadDecoder } from '../src/yahoo.ts';

const decode = await loadDecoder();

async function encodeSample(fields: Record<string, unknown>): Promise<string> {
  const root = await protobufjs.load(path.join(import.meta.dirname, '../src/tickerproto.proto'));
  const type = root.lookupType('tickerproto');
  return Buffer.from(type.encode(type.fromObject(fields)).finish()).toString('base64');
}

test('decodes a base64 protobuf message', async () => {
  const base64 = await encodeSample({ id: 'BTC-USD', price: 74556.3, time: 1762700000000, priceHint: 2 });
  assert.deepEqual(decode(base64), { ticker: 'BTC-USD', price: 74556.3, time: 1762700000000 });
});

test('decodes a message wrapped in JSON', async () => {
  const base64 = await encodeSample({ id: 'AAPL', price: 190.25, time: 1762700000000 });
  assert.deepEqual(decode(JSON.stringify({ type: 'pricing', message: base64 })), {
    ticker: 'AAPL',
    price: 190.25,
    time: 1762700000000,
  });
});

test('decodes a real message captured from Yahoo', () => {
  const sample =
    'CgdCVEMtVVNEFRedkUcY0I6embhoIgNVU0QqA0NDQzApOAFFI9rZv0iA4OPZ7gFVaF6TR12a+I9HZYBbocR96e+RR7ABgODj2e4B2AEE4AGA4OPZ7gHoAYDg49nuAfIBA0JUQ4ECAAAAYKotc0GJAgAA9sCFy3VC9QKAW6HE/QIj2tm/';
  const point = decode(sample);
  assert.equal(point.ticker, 'BTC-USD');
  assert.ok(point.price > 1000);
  assert.ok(point.time > Date.UTC(2020, 0, 1), 'time should be epoch milliseconds');
});

test('rejects a message without a price', async () => {
  assert.throws(() => decode(Buffer.from('not protobuf').toString('base64')));
  const base64 = await encodeSample({ id: 'BTC-USD' });
  assert.throws(() => decode(base64), /no ticker or price/);
});
