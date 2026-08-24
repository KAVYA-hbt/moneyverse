import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { FinancialLiteracy } from '../types/api';

interface FinancialRadarProps {
  financialLiteracy: FinancialLiteracy;
}

export function FinancialRadar({ financialLiteracy }: FinancialRadarProps) {
  // The wireframe's "Competency Radar" assumes several numeric dimensions (Budgeting, Savings,
  // Credit & Debt, ...). Two real shapes exist: the synthetic seed data's { score, level } (one
  // numeric signal + a qualitative label), and real game telemetry's multi-axis
  // { budgeting_score, savings_score, ... } where any axis may be null if the game hasn't
  // measured it yet for this player. Axis and quality entries are both kept (not filtered out)
  // so unmeasured axes render as a visible greyed/dashed placeholder instead of silently
  // disappearing from the chart.
  const allEntries = Object.entries(financialLiteracy || {}).filter(
    ([, v]) => typeof v === 'number' || v === null,
  ) as [string, number | null][];
  const qualitativeEntries = Object.entries(financialLiteracy || {}).filter(
    ([, v]) => typeof v !== 'number' && v !== null,
  );

  if (allEntries.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-on-surface-variant">
        No financial literacy data available.
      </div>
    );
  }

  const measuredCount = allEntries.filter(([, v]) => v !== null).length;
  const missingLabels = allEntries.filter(([, v]) => v === null).map(([k]) => k.replace(/_/g, ' '));

  if (allEntries.length < 3) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3">
        {allEntries.map(([dimension, score]) => (
          <div
            key={dimension}
            className={`flex w-full max-w-[220px] flex-col items-center gap-1 ${score === null ? 'opacity-50' : ''}`}
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {dimension.replace(/_/g, ' ')}
            </span>
            {score === null ? (
              <span className="text-sm font-medium italic text-on-surface-variant">No data yet</span>
            ) : (
              <span className="text-3xl font-bold text-primary">
                {Math.round(score * 100)}
                <span className="text-base font-medium text-on-surface-variant">%</span>
              </span>
            )}
            <div className="h-2 w-full overflow-hidden rounded-full border border-dashed border-outline-variant bg-surface-container-high">
              {score !== null && (
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, score * 100))}%` }}
                />
              )}
            </div>
          </div>
        ))}
        {qualitativeEntries.map(([k, v]) => (
          <span
            key={k}
            className="rounded-full border border-outline-variant bg-surface-container px-3 py-1 text-xs font-medium capitalize text-on-surface-variant"
          >
            {k.replace(/_/g, ' ')}: {String(v)}
          </span>
        ))}
      </div>
    );
  }

  // Null axes plot at 0 (grey/dashed styling communicates "not measured", not "measured as 0").
  const data = allEntries.map(([dimension, score]) => ({
    dimension: dimension.replace(/_/g, ' '),
    score: score ?? 0,
    missing: score === null,
  }));

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="#c8c5d0" strokeOpacity={0.3} />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 10, fontWeight: 600, fill: '#47464f' }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
            <Radar
              name="Financial literacy"
              dataKey="score"
              stroke={measuredCount > 0 ? 'rgba(30, 27, 75, 0.8)' : 'rgba(120, 118, 128, 0.6)'}
              strokeDasharray={measuredCount > 0 ? undefined : '4 3'}
              fill={measuredCount > 0 ? 'rgba(30, 27, 75, 0.2)' : 'rgba(120, 118, 128, 0.12)'}
              fillOpacity={1}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value, _name, item) => {
                const missing = (item?.payload as { missing?: boolean } | undefined)?.missing;
                if (missing) return ['No data yet', ''];
                return [typeof value === 'number' ? value.toFixed(2) : value, ''];
              }}
              contentStyle={{
                fontSize: 12,
                background: 'rgba(25, 28, 30, 0.9)',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {missingLabels.length > 0 && (
        <p className="mt-1 text-center text-xs italic text-on-surface-variant">
          Not yet measured: {missingLabels.join(', ')}
        </p>
      )}
    </div>
  );
}
