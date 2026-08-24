import { ConfidenceBadge } from './ConfidenceBadge';
import type { ConfidenceLevel } from '../types/api';

interface ProfileHeaderProps {
  name: string;
  segmentTags: string[];
  confidenceLevel?: ConfidenceLevel;
  subtitle?: string;
  /** 'lg' for the RM quick-scan hero header, 'sm' for compact contexts like the case-detail rail. */
  size?: 'lg' | 'sm';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const chars = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '');
  return chars.join('') || '?';
}

// Shared avatar-initials + name + tag chips header, used by the RM quick-scan
// layout and reused (in its compact size) by the hand-off case detail rail's
// Player Profile Summary card so the two screens never diverge on markup.
export function ProfileHeader({
  name,
  segmentTags,
  confidenceLevel,
  subtitle,
  size = 'lg',
}: ProfileHeaderProps) {
  const avatarSize = size === 'lg' ? 'h-16 w-16 text-2xl' : 'h-10 w-10 text-sm';
  return (
    <div className={`flex items-start ${size === 'lg' ? 'gap-4' : 'gap-3'}`}>
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high font-semibold text-on-surface-variant shadow-sm ${avatarSize}`}
      >
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className={
              size === 'lg'
                ? 'text-2xl font-semibold tracking-tight text-on-surface'
                : 'text-base font-semibold text-on-surface'
            }
          >
            {name}
          </h1>
          {confidenceLevel && size === 'sm' && (
            <ConfidenceBadge level={confidenceLevel} compact />
          )}
        </div>
        {subtitle && <p className="mt-0.5 text-sm text-on-surface-variant">{subtitle}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {segmentTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-surface-variant bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
        </div>
        {confidenceLevel && size === 'lg' && (
          <div className="mt-2">
            <ConfidenceBadge level={confidenceLevel} />
          </div>
        )}
      </div>
    </div>
  );
}
