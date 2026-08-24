import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface PsychometricRadarProps {
  /** Same flattened (label, value) pairs ProfileDetailPage already builds for the TraitBar
      list -- passed in rather than recomputed here so the two views can never disagree about
      which sub-fields count as "traits". */
  traits: [string, number | null][];
}

// Distinct from FinancialRadar's primary/indigo hue so the two radars in the same layout read
// as different series at a glance, matching the app's existing secondary=teal accent usage.
const STROKE = 'rgba(0, 107, 95, 0.8)';
const FILL = 'rgba(0, 107, 95, 0.2)';
const STROKE_EMPTY = 'rgba(120, 118, 128, 0.6)';
const FILL_EMPTY = 'rgba(120, 118, 128, 0.12)';

export function PsychometricRadar({ traits }: PsychometricRadarProps) {
  const allEntries = traits.filter(
    ([, v]) => v === null || (typeof v === 'number' && !Number.isNaN(v)),
  );

  if (allEntries.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-on-surface-variant">
        No psychometric data available.
      </div>
    );
  }

  // A radar needs 3+ axes to read as a shape -- ProfileDetailPage's TraitBar list below still
  // covers this case with plain bars, so this component just steps aside rather than rendering
  // a degenerate triangle-less radar.
  if (allEntries.length < 3) {
    return null;
  }

  const measuredCount = allEntries.filter(([, v]) => v !== null).length;
  const missingLabels = allEntries.filter(([, v]) => v === null).map(([k]) => k.replace(/_/g, ' '));

  // Some psychometric sub-fields (e.g. decision_style.deliberation_speed) are already 0-100;
  // others (personality_traits_lite.*) are 0-1 like financial_literacy. Normalize anything > 1
  // down to a 0-1 scale so every axis shares one radius instead of the >1 axes blowing past it.
  const data = allEntries.slice(0, 8).map(([dimension, score]) => {
    const normalized = score === null ? 0 : score > 1 ? score / 100 : score;
    return { dimension: dimension.replace(/_/g, ' '), score: normalized, missing: score === null };
  });

  return (
    <div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="#c8c5d0" strokeOpacity={0.3} />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 9, fontWeight: 600, fill: '#47464f' }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
            <Radar
              name="Psychometric traits"
              dataKey="score"
              stroke={measuredCount > 0 ? STROKE : STROKE_EMPTY}
              strokeDasharray={measuredCount > 0 ? undefined : '4 3'}
              fill={measuredCount > 0 ? FILL : FILL_EMPTY}
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
