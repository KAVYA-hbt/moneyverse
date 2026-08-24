import type { ConfidenceLevel } from '../types/api';

// Matches the "Profile Confidence: High" pill in player_profile_analyst_view
// (teal-ish for high, neutral tones down the scale).
const STYLES: Record<ConfidenceLevel, string> = {
  low: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
  medium: 'bg-[#E3F2FD] text-[#0d47a1] border-[#90CAF9]',
  high: 'bg-[#E0F2F1] text-[#00695C] border-[#B2DFDB]',
};

export function ConfidenceBadge({
  level,
  compact = false,
}: {
  level: ConfidenceLevel;
  /** Compact form for dense contexts like table rows: no icon, no "Profile Confidence" prefix. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STYLES[level]}`}
      >
        {level}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${STYLES[level]}`}
    >
      <span className="material-symbols-outlined icon-fill text-[16px]">shield</span>
      Profile Confidence: {level}
    </span>
  );
}
