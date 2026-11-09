import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import type { PricePoint } from '../../shared/protocol.ts';

export type PriceDb = Database;

/** Opens (or creates) the database and makes sure the table and index exist. */
export async function openPriceDb(filename: string): Promise<PriceDb> {
  const db = await open({ filename, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticker TEXT NOT NULL,
      price REAL NOT NULL,
      time INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS prices_ticker_time ON prices (ticker, time);
  `);
  return db;
}

export async function insertPrice(db: PriceDb, point: PricePoint): Promise<void> {
  await db.run('INSERT INTO prices (ticker, price, time) VALUES (?, ?, ?)', [
    point.ticker,
    point.price,
    point.time,
  ]);
}

/** Returns the latest `limit` prices for a ticker, oldest first. */
export async function getHistory(db: PriceDb, ticker: string, limit: number): Promise<PricePoint[]> {
  return db.all<PricePoint[]>(
    `SELECT ticker, price, time FROM (
       SELECT ticker, price, time FROM prices
       WHERE ticker = ? ORDER BY time DESC LIMIT ?
     ) ORDER BY time ASC`,
    [ticker, limit],
  );
}
