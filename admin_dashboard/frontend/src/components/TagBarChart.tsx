import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TagCount } from '../types/api';

interface TagBarChartProps {
  data: TagCount[];
  /** Backend already sorts descending by count -- this just caps how many bars render so the
      chart stays readable if the cohort produces many distinct tags. */
  limit?: number;
  emptyLabel?: string;
}

// Matches FinancialRadar's primary-container tone -- single hue since this is one series
// (count) compared across categories, not multiple series needing identity encoding.
const BAR_FILL = 'rgba(30, 27, 75, 0.75)';

export function TagBarChart({ data, limit = 8, emptyLabel = 'No data yet.' }: TagBarChartProps) {
  const rows = data.slice(0, limit).map((d) => ({ ...d, label: d.tag.replace(/_/g, ' ') }));

  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-on-surface-variant">
        {emptyLabel}
      </div>
    );
  }

  const height = Math.max(120, rows.length * 34);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
          <CartesianGrid horizontal={false} stroke="#c8c5d0" strokeOpacity={0.3} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#787680' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            tick={{ fontSize: 12, fill: '#47464f' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(30, 27, 75, 0.06)' }}
            formatter={(value) => [`${value} player${value === 1 ? '' : 's'}`, '']}
            contentStyle={{
              fontSize: 12,
              background: 'rgba(25, 28, 30, 0.9)',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
            }}
          />
          <Bar dataKey="count" fill={BAR_FILL} radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
