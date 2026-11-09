// Messages sent between the server and the browser over the local WebSocket.
// Both the server and the client import this file, so they always agree.

/** One price for one ticker. `time` is a UTC timestamp in milliseconds since 1970. */
export interface PricePoint {
  ticker: string;
  price: number;
  time: number;
}

/** Messages the browser may send to the server. */
export interface HistoryRequest {
  type: 'history';
  ticker: string;
  limit: number;
}
export type ClientMessage = HistoryRequest;

/** Messages the server sends to the browser. */
export type ServerMessage =
  | { type: 'tickers'; tickers: string[] }
  | { type: 'history'; ticker: string; prices: PricePoint[] }
  | ({ type: 'price' } & PricePoint)
  | { type: 'error'; message: string };

export const MAX_HISTORY = 500;

const TICKER_PATTERN = /^[A-Z0-9.^=-]{1,20}$/;

/**
 * Checks a raw message from a browser. Returns the parsed message, or null if
 * it is not valid JSON or not a known message type.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;

  const { type, ticker, limit } = data as Record<string, unknown>;
  if (type !== 'history') return null;
  if (typeof ticker !== 'string' || !TICKER_PATTERN.test(ticker)) return null;
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return null;

  return {
    type,
    ticker,
    limit: Math.min(MAX_HISTORY, Math.max(1, Math.floor(limit))),
  };
}
