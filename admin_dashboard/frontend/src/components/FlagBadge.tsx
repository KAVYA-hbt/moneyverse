import { FLAG_COLORS, FLAG_CHIP_COLORS, FLAG_ICONS, FLAG_LABELS } from '../constants/flagColors';
import type { FlagKind } from '../types/api';

interface FlagBadgeProps {
  kind: FlagKind;
  label?: string;
  title?: string;
  /** 'pill' (default): compact dot+label badge for tables/headers.
   *  'chip': bold icon+label chip matching the RM quick-scan flag row. */
  variant?: 'pill' | 'chip';
}

export function FlagBadge({ kind, label, title, variant = 'pill' }: FlagBadgeProps) {
  if (variant === 'chip') {
    const colors = FLAG_CHIP_COLORS[kind];
    return (
      <span
        title={title}
        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm ${colors.bg} ${colors.text} ${colors.border}`}
      >
        <span className="material-symbols-outlined icon-fill text-[18px]">
          {FLAG_ICONS[kind]}
        </span>
        {label ?? FLAG_LABELS[kind]}
      </span>
    );
  }

  const colors = FLAG_COLORS[kind];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {label ?? FLAG_LABELS[kind]}
    </span>
  );
}
