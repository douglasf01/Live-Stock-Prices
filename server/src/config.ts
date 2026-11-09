// Settings read from environment variables, with defaults.

function parseTickers(value: string | undefined): string[] {
  const tickers = (value ?? 'BTC-USD')
    .split(',')
    .map((ticker) => ticker.trim().toUpperCase())
    .filter((ticker) => ticker.length > 0);
  return tickers.length > 0 ? tickers : ['BTC-USD'];
}

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a number between 1 and 65535, got "${value}"`);
  }
  return port;
}

export const config = {
  tickers: parseTickers(process.env.TICKERS),
  port: parsePort(process.env.PORT),
  dbPath: process.env.DB_PATH ?? 'tickerdata.db',
  yahooUrl: process.env.YAHOO_URL ?? 'wss://streamer.finance.yahoo.com/',
};
