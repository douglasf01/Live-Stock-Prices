import { LineChart } from '@mui/x-charts/LineChart';
import { ChartsReferenceLine } from '@mui/x-charts/ChartsReferenceLine';
import type { PricePoint } from '../../shared/protocol.ts';
import { CHART_COLORS } from './colors.ts';
import { formatPrice } from './market.ts';

interface PriceChartProps {
  ticker: string;
  points: PricePoint[];
  color: string;
}

const AXIS_LABEL_STYLE = { fill: CHART_COLORS.axisText, fontSize: 11 };

/** Axis labels for large prices do not need cents. */
function formatAxisPrice(value: number, reference: number): string {
  if (Math.abs(reference) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return formatPrice(value, reference);
}

const TOOLTIP_TIME: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
};

function tickTime(date: Date, spanMs: number): string {
  const options: Intl.DateTimeFormatOptions =
    spanMs < 10 * 60_000
      ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }
      : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  return date.toLocaleTimeString(undefined, options);
}

/**
 * Line chart of one ticker, with time on the x axis, prices on the right and a
 * hover tooltip. A dotted line marks the first price in the range.
 */
export function PriceChart({ ticker, points, color }: PriceChartProps) {
  const prices = points.map((point) => point.price);
  const spanMs = points.length > 1 ? points[points.length - 1].time - points[0].time : 0;
  const reference = prices[prices.length - 1] ?? 0;

  return (
    <LineChart
      skipAnimation
      hideLegend
      margin={{ top: 8, right: 0, bottom: 0, left: 4 }}
      xAxis={[
        {
          data: points.map((point) => new Date(point.time)),
          scaleType: 'time',
          domainLimit: 'strict',
          tickLabelStyle: AXIS_LABEL_STYLE,
          tickSize: 4,
          height: 28,
          tickNumber: 6,
          tickLabelMinGap: 24,
          valueFormatter: (date: Date, context) =>
            context.location === 'tick' ? tickTime(date, spanMs) : date.toLocaleString(undefined, TOOLTIP_TIME),
        },
      ]}
      yAxis={[
        {
          position: 'right',
          width: 72,
          disableLine: true,
          tickSize: 4,
          tickLabelStyle: AXIS_LABEL_STYLE,
          tickNumber: 6,
          valueFormatter: (value: number) => formatAxisPrice(value, reference),
        },
      ]}
      series={[
        {
          data: prices,
          label: ticker,
          color,
          showMark: false,
          curve: 'linear',
          valueFormatter: (value) => (value === null ? '' : formatPrice(value, reference)),
        },
      ]}
      grid={{ horizontal: true, vertical: true }}
      sx={{
        '& .MuiLineElement-root': { strokeWidth: 1.5 },
        '& .MuiChartsGrid-line': { stroke: CHART_COLORS.grid, strokeWidth: 1 },
        '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: CHART_COLORS.grid },
        '& .MuiChartsAxisHighlight-root': { stroke: CHART_COLORS.axisText, strokeDasharray: 'none' },
      }}
    >
      <ChartsReferenceLine
        y={prices[0]}
        lineStyle={{ stroke: CHART_COLORS.openLine, strokeDasharray: '2 3', strokeWidth: 1 }}
      />
    </LineChart>
  );
}
