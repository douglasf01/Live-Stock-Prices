import { useEffect, useState } from 'react';
import { MAX_HISTORY, type PricePoint, type ServerMessage } from '../../shared/protocol.ts';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:8080';
// The server sends at most MAX_HISTORY old prices. Live prices are added on
// top, and the oldest are dropped once a ticker has more than this.
const MAX_POINTS = 2000;
const MAX_RETRY_MS = 30_000;

export type Status = 'connecting' | 'live' | 'disconnected';

export interface TickerData {
  points: PricePoint[];
  /** Live prices received since the page was opened (history not counted). */
  liveUpdates: number;
}

export type PriceMap = Record<string, TickerData>;

/** Adds new points, drops duplicates, keeps them in time order and keeps only the newest. */
function mergePoints(current: PricePoint[], incoming: PricePoint[]): PricePoint[] {
  const byTime = new Map<number, PricePoint>();
  for (const point of [...current, ...incoming]) byTime.set(point.time, point);
  return [...byTime.values()].sort((a, b) => a.time - b.time).slice(-MAX_POINTS);
}

function addPoints(map: PriceMap, ticker: string, incoming: PricePoint[], live: boolean): PriceMap {
  const old = map[ticker] ?? { points: [], liveUpdates: 0 };
  return {
    ...map,
    [ticker]: {
      points: mergePoints(old.points, incoming),
      liveUpdates: old.liveUpdates + (live ? 1 : 0),
    },
  };
}

/**
 * Connects to the local server, loads recent history for every ticker the
 * server follows, then adds live prices as they arrive. Reconnects with a
 * growing delay if the connection drops.
 */
export function useLivePrices() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [prices, setPrices] = useState<PriceMap>({});
  const [status, setStatus] = useState<Status>('connecting');

  useEffect(() => {
    let socket: WebSocket | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1000;
    let disposed = false;

    function connect() {
      setStatus('connecting');
      const ws = new WebSocket(SERVER_URL);
      socket = ws;

      ws.onopen = () => {
        retryDelay = 1000;
        setStatus('live');
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        let message: ServerMessage;
        try {
          message = JSON.parse(event.data) as ServerMessage;
        } catch {
          console.warn('Ignoring a message that is not valid JSON');
          return;
        }
        switch (message.type) {
          case 'tickers':
            setTickers(message.tickers);
            for (const ticker of message.tickers) {
              ws.send(JSON.stringify({ type: 'history', ticker, limit: MAX_HISTORY }));
            }
            break;
          case 'history':
            setPrices((map) => addPoints(map, message.ticker, message.prices, false));
            break;
          case 'price': {
            const { ticker, price, time } = message;
            setPrices((map) => addPoints(map, ticker, [{ ticker, price, time }], true));
            break;
          }
          case 'error':
            console.error('Server error:', message.message);
            break;
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setStatus('disconnected');
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
      };
    }

    connect();

    // Runs when the component unmounts, and between the two runs React makes in
    // development (StrictMode), so only one connection is ever left open.
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);

  return { tickers, prices, status };
}
