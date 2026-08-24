import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfileList } from '../hooks/useProfiles';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import type { ConfidenceLevel } from '../types/api';

const PAGE_SIZE = 20;

export function ProfilesListPage() {
  const [segment, setSegment] = useState('');
  const [confidence, setConfidence] = useState<ConfidenceLevel | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching } = useProfileList({
    segment: segment || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const filteredItems = confidence
    ? items.filter((i) => i.confidence_level === confidence)
    : items;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const fieldClass =
    'rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">Player Profiles</h1>
          <p className="text-sm text-on-surface-variant">Browse and filter the player cohort.</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-on-surface-variant">
            Segment tag
          </label>
          <input
            value={segment}
            onChange={(e) => {
              setSegment(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. high_saver"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-on-surface-variant">
            Confidence level
          </label>
          <select
            value={confidence}
            onChange={(e) => {
              setConfidence(e.target.value as ConfidenceLevel | '');
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          {/* Score-range filter placeholder: no `score` filter is defined on
              profile list items in the contract, so this is UI-only until a
              scoring field is specified. */}
          <label className="mb-1 block text-xs font-medium text-on-surface-variant">
            Score range
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min"
              disabled
              className="w-16 rounded-md border border-outline-variant bg-surface-container px-2 py-1.5 text-sm text-outline"
              title="Coming soon"
            />
            <span className="text-outline">–</span>
            <input
              type="number"
              placeholder="Max"
              disabled
              className="w-16 rounded-md border border-outline-variant bg-surface-container px-2 py-1.5 text-sm text-outline"
              title="Coming soon"
            />
          </div>
        </div>
        {isFetching && <span className="text-xs text-on-surface-variant">Refreshing…</span>}
      </div>

      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
        <table className="min-w-full divide-y divide-outline-variant text-sm">
          <thead className="bg-surface-container-low">
            <tr>
              {['Name', 'Segment tags', 'Level', 'Confidence', 'Open mismatches', 'Last active'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/60">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                  Loading profiles…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-error">
                  Failed to load profiles.
                </td>
              </tr>
            )}
            {!isLoading && !isError && filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                  No profiles match these filters.
                </td>
              </tr>
            )}
            {filteredItems.map((p) => (
              <tr key={p.player_id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-2.5">
                  <Link
                    to={`/profiles/${p.player_id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {p.segment_tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-surface-container px-1.5 py-0.5 text-xs text-on-surface-variant"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-on-surface-variant">{p.current_game_level}</td>
                <td className="px-4 py-2.5">
                  <ConfidenceBadge level={p.confidence_level} compact />
                </td>
                <td className="px-4 py-2.5 text-on-surface-variant">{p.open_mismatch_count}</td>
                <td className="px-4 py-2.5 text-on-surface-variant">
                  {new Date(p.last_active_at).toLocaleDateString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-on-surface-variant">
        <span>
          Page {data?.page ?? page} of {totalPages} · {data?.total ?? 0} total
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-outline-variant px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-outline-variant px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
