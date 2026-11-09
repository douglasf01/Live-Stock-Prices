import { useEffect, useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { TREND_COLORS } from './colors.ts';
import {
  formatAgo,
  formatChange,
  formatClock,
  formatPercent,
  formatPrice,
  pointsInRange,
  RANGES,
  summarize,
  trend,
  useNow,
  type RangeId,
} from './market.ts';
import { PriceChart } from './PriceChart';
import { TickerRow } from './TickerRow';
import { useLivePrices, type Status } from './useLivePrices';
import './App.css';

const TITLE = 'Live Stock Prices';

// Dark MUI theme so the chart tooltip matches the page.
const theme = createTheme({
  palette: { mode: 'dark', background: { paper: '#1a1a1a' }, text: { primary: '#e6e4df' } },
  shape: { borderRadius: 2 },
  typography: { fontFamily: 'var(--font)', fontSize: 13 },
});

const STATUS_TEXT: Record<Status, string> = {
  connecting: 'connecting',
  live: 'live',
  disconnected: 'offline, retrying',
};

export default function App() {
  const { tickers, prices, status } = useLivePrices();
  const [chosen, setChosen] = useState<string>();
  const [range, setRange] = useState<RangeId>('15m');
  const now = useNow();

  const selected = chosen && tickers.includes(chosen) ? chosen : tickers[0];
  const selectedData = selected ? prices[selected] : undefined;
  const visible = pointsInRange(selectedData?.points ?? [], range, now);
  const summary = summarize(visible);
  const direction = summary ? trend(summary.change) : 'flat';
  const rangeLabel = RANGES.find((r) => r.id === range)?.label;

  useEffect(() => {
    document.title = selected && summary ? `${selected} ${formatPrice(summary.last)} | ${TITLE}` : TITLE;
  }, [selected, summary?.last]);

  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        <header className="masthead">
          <h1>{TITLE}</h1>
          <span className={`status ${status}`} role="status">
            {STATUS_TEXT[status]}
          </span>
        </header>

        {tickers.length === 0 ? (
          <p className="empty">Waiting for the server to send its ticker list...</p>
        ) : (
          <main className="screen">
            <section className="watchlist" aria-label="Watchlist">
              <div className="watchlist-head">
                <span>Symbol</span>
                <span className="spark" />
                <span className="num">Last</span>
                <span className="num chg">Chg</span>
                <span className="num">Chg %</span>
              </div>
              <ul>
                {tickers.map((ticker) => (
                  <TickerRow
                    key={ticker}
                    ticker={ticker}
                    points={pointsInRange(prices[ticker]?.points ?? [], range, now)}
                    liveUpdates={prices[ticker]?.liveUpdates ?? 0}
                    selected={ticker === selected}
                    onSelect={() => setChosen(ticker)}
                  />
                ))}
              </ul>
              <p className="note">
                {range === 'all' ? 'Change since the first loaded price.' : `Change over the last ${rangeLabel}.`}
              </p>
            </section>

            <section className="detail" aria-label={`${selected} chart`}>
              <div className="detail-head">
                <div className="quote">
                  <h2>{selected}</h2>
                  {summary ? (
                    <>
                      <span className="quote-price">{formatPrice(summary.last)}</span>
                      <span className={`quote-change ${direction}`}>
                        {formatChange(summary.change, summary.last)} ({formatPercent(summary.percent)})
                      </span>
                    </>
                  ) : (
                    <span className="muted">No prices yet</span>
                  )}
                </div>
                <div className="ranges" role="group" aria-label="Time range">
                  {RANGES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={r.id === range ? 'is-active' : ''}
                      aria-pressed={r.id === range}
                      onClick={() => setRange(r.id)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chart-box">
                {selected && visible.length > 1 ? (
                  <PriceChart ticker={selected} points={visible} color={TREND_COLORS[direction]} />
                ) : (
                  <p className="empty">
                    Not enough prices in this time range yet. Try a longer range or give it a moment.
                  </p>
                )}
              </div>

              <dl className="stats">
                <Stat label="Open" value={summary ? formatPrice(summary.open, summary.last) : '-'} />
                <Stat label="High" value={summary ? formatPrice(summary.high, summary.last) : '-'} />
                <Stat label="Low" value={summary ? formatPrice(summary.low, summary.last) : '-'} />
                <Stat label="Live updates" value={String(selectedData?.liveUpdates ?? 0)} />
                <Stat
                  label="Last update"
                  value={summary ? formatClock(summary.lastTime) : '-'}
                  hint={summary ? formatAgo(summary.lastTime, now) : undefined}
                />
              </dl>
            </section>
          </main>
        )}
      </div>
    </ThemeProvider>
  );
}

interface StatProps {
  label: string;
  value: string;
  hint?: string;
}

function Stat({ label, value, hint }: StatProps) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value}
        {hint && <span className="muted"> {hint}</span>}
      </dd>
    </div>
  );
}
