// Small helpers for time ranges, summary numbers and number formatting.
import { useEffect, useState } from 'react';
import type { PricePoint } from '../../shared/protocol.ts';

export const RANGES = [
  { id: '5m', label: '5m', ms: 5 * 60_000 },
  { id: '15m', label: '15m', ms: 15 * 60_000 },
  { id: '1h', label: '1h', ms: 60 * 60_000 },
  { id: 'all', label: 'All', ms: Infinity },
] as const;

export type RangeId = (typeof RANGES)[number]['id'];

/** Keeps the points that are newer than `now - range`. */
export function pointsInRange(points: PricePoint[], range: RangeId, now: number): PricePoint[] {
  const ms = RANGES.find((r) => r.id === range)?.ms ?? Infinity;
  if (ms === Infinity) return points;
  const cutoff = now - ms;
  return points.filter((point) => point.time >= cutoff);
}

export interface Summary {
  /** The first price in the range. */
  open: number;
  last: number;
  change: number;
  percent: number;
  high: number;
  low: number;
  lastTime: number;
}

/** First and last price, change since the first point, high and low. Null if there are no points. */
export function summarize(points: PricePoint[]): Summary | null {
  if (points.length === 0) return null;
  const first = points[0].price;
  const lastPoint = points[points.length - 1];
  let high = -Infinity;
  let low = Infinity;
  for (const { price } of points) {
    if (price > high) high = price;
    if (price < low) low = price;
  }
  const change = lastPoint.price - first;
  return {
    open: first,
    last: lastPoint.price,
    change,
    percent: first === 0 ? 0 : (change / first) * 100,
    high,
    low,
    lastTime: lastPoint.time,
  };
}

/** 'up', 'down' or 'flat', used for colors. */
export function trend(change: number): 'up' | 'down' | 'flat' {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'flat';
}

/** Cheap prices (like DOGE) need more decimals to show any movement. */
function decimalsFor(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0 || abs >= 1) return 2;
  if (abs >= 0.01) return 4;
  return 6;
}

export function formatPrice(value: number, reference = value): string {
  const digits = decimalsFor(reference);
  return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatChange(change: number, reference: number): string {
  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  return sign + formatPrice(Math.abs(change), reference);
}

export function formatPercent(percent: number): string {
  const sign = percent > 0 ? '+' : percent < 0 ? '-' : '';
  return `${sign}${Math.abs(percent).toFixed(2)}%`;
}

export function formatClock(time: number): string {
  return new Date(time).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
}

export function formatAgo(time: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

/** The current time, refreshed every `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
