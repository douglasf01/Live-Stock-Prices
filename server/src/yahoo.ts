import path from 'node:path';
import protobufjs from 'protobufjs';
import WebSocket from 'ws';
import type { PricePoint } from '../../shared/protocol.ts';

const PROTO_PATH = path.join(import.meta.dirname, 'tickerproto.proto');
const HEARTBEAT_MS = 30_000;
const MAX_RETRY_MS = 30_000;

export type Decoder = (data: string) => PricePoint;

/** Loads the .proto file and returns a function that turns a Yahoo message into a price. */
export async function loadDecoder(): Promise<Decoder> {
  const root = await protobufjs.load(PROTO_PATH);
  const type = root.lookupType('tickerproto');

  return (data) => {
    // Yahoo sends base64 text. Newer versions wrap it as {"message": "<base64>"}.
    const text = data.trim();
    const base64 = text.startsWith('{') ? (JSON.parse(text) as { message: string }).message : text;
    const quote = type.toObject(type.decode(Buffer.from(base64, 'base64')), { longs: Number }) as {
      id?: string;
      price?: number;
      time?: number;
      priceHint?: number;
    };
    if (!quote.id || typeof quote.price !== 'number') {
      throw new Error('Message has no ticker or price');
    }
    // The price is a 32-bit float, so round it to the decimals Yahoo suggests.
    const decimals = Math.min(8, Math.max(0, quote.priceHint ?? 2));
    return {
      ticker: quote.id,
      price: Number(quote.price.toFixed(decimals)),
      time: quote.time || Date.now(),
    };
  };
}

interface YahooOptions {
  url: string;
  tickers: string[];
  decode: Decoder;
  onPrice: (point: PricePoint) => void;
}

/**
 * Connects to Yahoo and subscribes to the tickers. If the connection drops or
 * stops answering pings, it reconnects with a growing delay (1s, 2s, 4s ... 30s).
 * Returns a function that closes the connection for good.
 */
export function connectYahoo({ url, tickers, decode, onPrice }: YahooOptions): () => void {
  let socket: WebSocket | undefined;
  let retryDelay = 1000;
  let retryTimer: NodeJS.Timeout | undefined;
  let heartbeat: NodeJS.Timeout | undefined;
  let stopped = false;

  function connect() {
    const ws = new WebSocket(url);
    socket = ws;
    let alive = true;

    ws.on('open', () => {
      console.log(`Connected to Yahoo, subscribing to ${tickers.join(', ')}`);
      retryDelay = 1000;
      ws.send(JSON.stringify({ subscribe: tickers }));
      heartbeat = setInterval(() => {
        if (!alive) {
          console.warn('Yahoo did not answer the last ping, reconnecting');
          ws.terminate();
          return;
        }
        alive = false;
        ws.ping();
      }, HEARTBEAT_MS);
    });

    ws.on('pong', () => {
      alive = true;
    });

    ws.on('message', (data) => {
      try {
        onPrice(decode(data.toString()));
      } catch (err) {
        console.error('Could not decode Yahoo message:', err);
      }
    });

    ws.on('error', (err) => console.error('Yahoo connection error:', err.message));

    ws.on('close', () => {
      clearInterval(heartbeat);
      if (stopped) return;
      console.warn(`Yahoo connection closed, retrying in ${retryDelay / 1000}s`);
      retryTimer = setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
    });
  }

  connect();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    clearInterval(heartbeat);
    socket?.close();
  };
}
