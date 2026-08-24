import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProfileAnalytics } from '../types/api';

// Same three hues as ConfidenceBadge.tsx's STYLES map -- kept in sync by hand so a "High"
// bar here always matches what a "High" badge looks like everywhere else in the app. Direct
// category labels on the Y-axis carry identity, not color alone.
const ORDER: { key: keyof ProfileAnalytics['confidence_breakdown']; label: string; color: string }[] = [
  { key: 'high', label: 'High', color: '#00695C' },
  { key: 'medium', label: 'Medium', color: '#0d47a1' },
  { key: 'low', label: 'Low', color: '#787680' },
];

export function ConfidenceBreakdownChart({
  breakdown,
}: {
  breakdown: ProfileAnalytics['confidence_breakdown'];
}) {
  const rows = ORDER.map((o) => ({ label: o.label, count: breakdown[o.key] ?? 0, color: o.color }));
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-on-surface-variant">
        No profiles yet.
      </div>
    );
  }

  return (
    <div style={{ height: 140 }}>
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
            width={70}
            tick={{ fontSize: 12, fontWeight: 600, fill: '#47464f' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
            formatter={(value) => {
              const n = Number(value);
              return [`${n} player${n === 1 ? '' : 's'} (${Math.round((n / total) * 100)}%)`, ''];
            }}
            contentStyle={{
              fontSize: 12,
              background: 'rgba(25, 28, 30, 0.9)',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
            {rows.map((r) => (
              <Cell key={r.label} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
