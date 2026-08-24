import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHandoffQueue } from '../hooks/useHandoffs';
import { FlagBadge } from '../components/FlagBadge';
import type { HandoffStatus, TriggerReason } from '../types/api';

const PAGE_SIZE = 20;

// No wireframe covers this queue list, so it's designed here from the same
// DESIGN.md table conventions used elsewhere: white rows, #F8FAFC hover,
// pill status/tier chips instead of a zebra stripe.
const STATUS_STYLES: Record<HandoffStatus, string> = {
  open: 'bg-error-container text-on-error-container border-error/20',
  claimed: 'bg-[#E3F2FD] text-[#0d47a1] border-[#90CAF9]',
  resolved: 'bg-[#E0F2F1] text-[#00695C] border-[#B2DFDB]',
};

const TRIGGER_LABELS: Record<TriggerReason, string> = {
  bot_confusion: 'Bot confusion',
  distress_language: 'Distress language',
  dpdp_request: 'DPDP request',
  high_value_decision: 'High-value decision',
  explicit_human_request: 'Explicit human request',
};

export function HandoffQueuePage() {
  const [status, setStatus] = useState<HandoffStatus | ''>('');
  const [triggerReason, setTriggerReason] = useState<TriggerReason | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isFetching } = useHandoffQueue({
    status: status || undefined,
    trigger_reason: triggerReason || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const fieldClass =
    'rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-on-surface">Hand-off Queue</h1>
        <p className="text-sm text-on-surface-variant">
          Cases escalated from the bot for human review.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-on-surface-variant">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as HandoffStatus | '');
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="claimed">Claimed</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-on-surface-variant">
            Trigger reason
          </label>
          <select
            value={triggerReason}
            onChange={(e) => {
              setTriggerReason(e.target.value as TriggerReason | '');
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="">All</option>
            {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {isFetching && <span className="text-xs text-on-surface-variant">Refreshing…</span>}
      </div>

      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
        <table className="min-w-full divide-y divide-outline-variant text-sm">
          <thead className="bg-surface-container-low">
            <tr>
              {['Player', 'Flags', 'Trigger reason', 'Tier', 'Status', 'Assigned', 'Created'].map(
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
                <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                  Loading queue…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-error">
                  Failed to load hand-off queue.
                </td>
              </tr>
            )}
            {!isLoading && !isError && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">
                  No cases match these filters.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-2.5">
                  <Link
                    to={`/handoffs/${item.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {item.player_name}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {item.active_flags.map((f, i) => (
                      <FlagBadge key={i} kind={f.kind} label={f.label} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-on-surface-variant">
                  {TRIGGER_LABELS[item.trigger_reason]}
                </td>
                <td className="px-4 py-2.5 text-on-surface-variant">Tier {item.tier_required}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[item.status]}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-on-surface-variant">
                  {item.assigned_admin_id ? 'Assigned' : '—'}
                </td>
                <td className="px-4 py-2.5 text-on-surface-variant">
                  {new Date(item.created_at).toLocaleString('en-IN')}
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
