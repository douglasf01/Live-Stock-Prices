import { SparkLineChart } from '@mui/x-charts/SparkLineChart';
import type { PricePoint } from '../../shared/protocol.ts';
import { TREND_COLORS } from './colors.ts';
import { formatChange, formatPercent, formatPrice, summarize, trend } from './market.ts';

interface TickerRowProps {
  ticker: string;
  points: PricePoint[];
  liveUpdates: number;
  selected: boolean;
  onSelect: () => void;
}

/** One clickable watchlist row: symbol, sparkline, last price and change. */
export function TickerRow({ ticker, points, liveUpdates, selected, onSelect }: TickerRowProps) {
  const summary = summarize(points);
  const direction = summary ? trend(summary.change) : 'flat';

  // The key changes with every live price, so the flash animation runs again.
  const flashKey = summary && liveUpdates > 0 ? `${summary.lastTime}` : 'still';
  const lastMove = points.length > 1 ? points[points.length - 1].price - points[points.length - 2].price : 0;

  return (
    <li>
      <button
        type="button"
        className={`row${selected ? ' is-selected' : ''}`}
        onClick={onSelect}
        aria-pressed={selected}
      >
        <span className="symbol">{ticker}</span>
        <span className="spark" aria-hidden="true">
          {points.length > 1 && (
            <SparkLineChart
              data={points.map((point) => point.price)}
              height={22}
              color={TREND_COLORS[direction]}
              curve="linear"
              sx={{ '& .MuiLineElement-root': { strokeWidth: 1.25 } }}
            />
          )}
        </span>
        <span
          key={flashKey}
          className={`num last${flashKey !== 'still' ? ` flash-${trend(lastMove)}` : ''}`}
        >
          {summary ? formatPrice(summary.last) : '-'}
        </span>
        <span className={`num chg ${direction}`}>
          {summary ? formatChange(summary.change, summary.last) : '-'}
        </span>
        <span className={`num pct ${direction}`}>{summary ? formatPercent(summary.percent) : '-'}</span>
      </button>
    </li>
  );
}
