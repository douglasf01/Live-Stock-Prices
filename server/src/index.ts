import WebSocket, { WebSocketServer } from 'ws';
import { parseClientMessage, type ServerMessage } from '../../shared/protocol.ts';
import { config } from './config.ts';
import { getHistory, insertPrice, openPriceDb } from './db.ts';
import { connectYahoo, loadDecoder } from './yahoo.ts';

const HEARTBEAT_MS = 30_000;

const db = await openPriceDb(config.dbPath);
const decode = await loadDecoder();

const wss = new WebSocketServer({ port: config.port });
const alive = new WeakMap<WebSocket, boolean>();
wss.on('listening', () => console.log(`Local WebSocket server listening on ws://localhost:${config.port}`));
wss.on('error', (err) => {
  console.error(`Local WebSocket server failed: ${err.message}`);
  process.exit(1);
});

function send(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

wss.on('connection', (ws) => {
  console.log('Browser connected');
  alive.set(ws, true);
  ws.on('pong', () => alive.set(ws, true));
  ws.on('close', () => console.log('Browser disconnected'));
  ws.on('error', (err) => console.error('Browser socket error:', err.message));

  send(ws, { type: 'tickers', tickers: config.tickers });

  ws.on('message', async (raw) => {
    const request = parseClientMessage(raw.toString());
    if (!request) {
      send(ws, { type: 'error', message: 'Unknown or invalid message' });
      return;
    }
    try {
      const prices = await getHistory(db, request.ticker, request.limit);
      send(ws, { type: 'history', ticker: request.ticker, prices });
    } catch (err) {
      console.error('Could not read history:', err);
      send(ws, { type: 'error', message: 'Could not read history' });
    }
  });
});

// Drop browsers that stopped answering pings.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!alive.get(ws)) {
      ws.terminate();
      continue;
    }
    alive.set(ws, false);
    ws.ping();
  }
}, HEARTBEAT_MS);

const stopYahoo = connectYahoo({
  url: config.yahooUrl,
  tickers: config.tickers,
  decode,
  onPrice: async (point) => {
    console.log(`${point.ticker} ${point.price} at ${new Date(point.time).toISOString()}`);
    for (const ws of wss.clients) send(ws, { type: 'price', ...point });
    try {
      await insertPrice(db, point);
    } catch (err) {
      console.error('Could not save price:', err);
    }
  },
});

async function shutdown() {
  console.log('Shutting down');
  stopYahoo();
  clearInterval(heartbeat);
  for (const ws of wss.clients) ws.terminate();
  wss.close();
  await db.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
