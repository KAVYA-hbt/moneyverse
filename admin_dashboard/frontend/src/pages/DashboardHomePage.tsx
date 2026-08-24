import { Link } from 'react-router-dom';
import { useProfileList } from '../hooks/useProfiles';
import { useHandoffQueue } from '../hooks/useHandoffs';
import { useAuth } from '../context/AuthContext';

export function DashboardHomePage() {
  const { user } = useAuth();
  const openHandoffs = useHandoffQueue({ status: 'open', page: 1, page_size: 1 });
  // The API_CONTRACT has no aggregate "total open mismatches across all players"
  // endpoint — only a per-player open_mismatch_count on each profile list row.
  // We approximate the stat card by summing that field over the largest single
  // page the backend allows (page_size is capped at 100 server-side) rather
  // than hardcoding the wireframe's placeholder "8"; on cohorts bigger than
  // that the number will undercount (documented, not silent).
  const profiles = useProfileList({ page: 1, page_size: 100 });

  const totalPlayers = profiles.data?.total;
  const openCaseCount = openHandoffs.data?.total;
  const mismatchCount = profiles.data?.items.reduce(
    (sum, p) => sum + p.open_mismatch_count,
    0,
  );
  const hasPending = (openCaseCount ?? 0) > 0 || (mismatchCount ?? 0) > 0;

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-primary">
          Welcome{user ? `, ${user.name.split(' ')[0]}` : ''}
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Here is the latest overview of the platform status.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Total Active Players"
          value={totalPlayers}
          icon="groups"
          iconColor="text-primary-container"
        />
        <StatCard
          label="Open Hand-off Cases"
          value={openCaseCount}
          icon="assignment"
          iconColor="text-primary-container"
        />
        <StatCard
          label="Profile Mismatches"
          value={mismatchCount}
          icon="warning"
          iconColor="text-[#f59e0b]"
          accent
        />
      </div>

      {!hasPending && !openHandoffs.isLoading && !profiles.isLoading ? (
        <div className="ambient-shadow-sm flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
          <div className="mb-4 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-surface-container">
            <span className="material-symbols-outlined text-[64px] text-on-surface-variant opacity-50">
              check_circle
            </span>
          </div>
          <h3 className="mb-1 text-lg font-semibold text-on-surface">No pending actions</h3>
          <p className="max-w-md text-sm text-on-surface-variant">
            The hand-off queue is currently clear. Any new escalations or mismatches will appear
            here.
          </p>
        </div>
      ) : (
        <div className="ambient-shadow-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h3 className="mb-3 text-base font-semibold text-on-surface">Needs attention</h3>
          <div className="flex flex-col gap-2 text-sm">
            {!!openCaseCount && (
              <Link
                to="/handoffs"
                className="flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3 hover:bg-surface-container-low"
              >
                <span className="text-on-surface">
                  {openCaseCount} open hand-off case{openCaseCount === 1 ? '' : 's'} awaiting
                  review
                </span>
                <span className="material-symbols-outlined text-on-surface-variant">
                  arrow_forward
                </span>
              </Link>
            )}
            {!!mismatchCount && (
              <Link
                to="/profiles"
                className="flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3 hover:bg-surface-container-low"
              >
                <span className="text-on-surface">
                  {mismatchCount} profile mismatch{mismatchCount === 1 ? '' : 'es'} across the
                  cohort
                </span>
                <span className="material-symbols-outlined text-on-surface-variant">
                  arrow_forward
                </span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconColor,
  accent,
}: {
  label: string;
  value: number | undefined;
  icon: string;
  iconColor: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`ambient-shadow-sm flex flex-col justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-shadow hover:ambient-shadow-md ${
        accent ? 'border-l-4 border-l-[#f59e0b]' : ''
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
      </div>
      <div className={`text-4xl font-bold tracking-tight ${accent ? 'text-[#b45309]' : 'text-primary'}`}>
        {value === undefined ? (
          <span className="inline-block h-9 w-16 animate-pulse rounded bg-surface-container-high" />
        ) : (
          value.toLocaleString('en-IN')
        )}
      </div>
    </div>
  );
}
