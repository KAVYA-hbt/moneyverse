interface TraitBarProps {
  label: string;
  /** null = not yet measured for this player; rendered as a greyed-out placeholder row. */
  value: number | null;
  max?: number;
  /** Cycles through the wireframe's per-metric bar colors (primary / surface-tint / tertiary-fixed-dim). */
  colorIndex?: number;
}

const BAR_COLORS = ['bg-primary', 'bg-surface-tint', 'bg-tertiary-fixed-dim'];

function levelLabel(pct: number): string {
  if (pct >= 66) return 'High';
  if (pct >= 33) return 'Med';
  return 'Low';
}

// Plain div/Tailwind bar — intentionally not a charting library. Matches the
// psychometric metric rows in player_profile_analyst_view/code.html: label +
// "Level (score)" above a track/fill pair, track = surface-container-high.
export function TraitBar({ label, value, max = 1, colorIndex = 0 }: TraitBarProps) {
  if (value === null) {
    return (
      <div className="opacity-50">
        <div className="mb-1 flex items-end justify-between text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {label.replace(/_/g, ' ')}
          </span>
          <span className="text-xs font-medium italic text-on-surface-variant">No data yet</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-dashed border-outline-variant bg-transparent" />
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fillColor = BAR_COLORS[colorIndex % BAR_COLORS.length];
  return (
    <div>
      <div className="mb-1 flex items-end justify-between text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          {label.replace(/_/g, ' ')}
        </span>
        <span className="text-xs font-semibold text-on-surface">
          {levelLabel(pct)} ({Math.round(pct)})
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
        <div className={`h-full rounded-full ${fillColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TraitCard({
  title,
  traits,
}: {
  title: string;
  traits: Record<string, number | null>;
}) {
  const entries = Object.entries(traits);
  if (entries.length === 0) return null;
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
      <h3 className="mb-3 border-b border-surface-variant pb-2 text-sm font-semibold capitalize text-on-surface">
        {title.replace(/_/g, ' ')}
      </h3>
      <div className="space-y-4">
        {entries.map(([key, val], i) => (
          <TraitBar key={key} label={key} value={val} colorIndex={i} />
        ))}
      </div>
    </div>
  );
}
