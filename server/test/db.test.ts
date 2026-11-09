import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getHistory, insertPrice, openPriceDb } from '../src/db.ts';

test('returns the latest prices for a ticker, oldest first', async () => {
  const db = await openPriceDb(':memory:');
  // Insert out of order and mix in another ticker.
  for (const time of [3000, 1000, 5000, 2000, 4000]) {
    await insertPrice(db, { ticker: 'BTC-USD', price: time / 10, time });
  }
  await insertPrice(db, { ticker: 'ETH-USD', price: 1, time: 6000 });

  const history = await getHistory(db, 'BTC-USD', 3);
  assert.deepEqual(
    history.map((p) => p.time),
    [3000, 4000, 5000],
  );
  assert.deepEqual(history[0], { ticker: 'BTC-USD', price: 300, time: 3000 });
  assert.deepEqual(await getHistory(db, 'AAPL', 10), []);
  await db.close();
});
