import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useHandoffQueue } from '../hooks/useHandoffs';

const linkBase =
  'flex items-center gap-3 rounded-lg p-3 text-sm transition-colors active:scale-95 duration-150';

const ROLE_LABELS: Record<string, string> = {
  tier1_admin: 'Tier 1 Admin',
  tier2_admin: 'Tier 2 Admin',
  product_analyst: 'Product Analyst',
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  // Live open-case-count badge on the nav item, per the wireframe's "5" pill.
  const { data: openCases } = useHandoffQueue({ status: 'open', page: 1, page_size: 1 });

  return (
    <nav className="flex h-full w-[260px] shrink-0 flex-col gap-2 bg-surface-container-low px-4 py-6">
      <div className="mb-4 px-2">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-base font-semibold text-on-primary-container">
            {user?.name
              ?.trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join('') || 'FA'}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-on-surface">
              {user?.name ?? 'Admin'}
            </div>
            <div className="truncate text-xs text-on-surface-variant">
              {user ? ROLE_LABELS[user.role] : 'Loading…'}
            </div>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> Online
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-1">
        <li>
          <NavLink
            to="/dashboard"
            onClick={onNavigate}
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              dashboard
            </span>
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/profiles"
            onClick={onNavigate}
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <span className="material-symbols-outlined">person_search</span>
            <span>Player Profiles</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/handoffs"
            onClick={onNavigate}
            className={({ isActive }) =>
              `${linkBase} justify-between ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <span className="flex items-center gap-3">
              <span className="material-symbols-outlined text-error">assignment_late</span>
              <span>Hand-off Queue</span>
            </span>
            {!!openCases?.total && (
              <span className="rounded-full bg-error px-1.5 py-0.5 text-[10px] font-semibold text-on-error">
                {openCases.total}
              </span>
            )}
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/analytics"
            onClick={onNavigate}
            className={({ isActive }) =>
              `${linkBase} ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <span className="material-symbols-outlined">analytics</span>
            <span>Cohort Analytics</span>
          </NavLink>
        </li>
      </ul>

      <div className="mt-auto border-t border-outline-variant pt-3">
        <RoleSwitcher />
      </div>
    </nav>
  );
}

// Dev-only convenience so the role-based rendering (Analyst vs RM view,
// tier1-only escalate action, etc.) can be demoed without a real multi-account
// login flow. Not a general auth UI — just re-authenticates as one of the
// three seeded demo admins.
function RoleSwitcher() {
  const { user, login, logout } = useAuth();

  async function switchTo(email: string) {
    logout();
    await login(email, 'devpass123');
  }

  return (
    <div className="px-1">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-outline">
        Viewing as (dev only)
      </label>
      <select
        value={user?.role ?? ''}
        onChange={(e) => {
          const role = e.target.value;
          const email =
            role === 'tier1_admin'
              ? 'rakesh.tier1@finguru.dev'
              : role === 'tier2_admin'
                ? 'arvind.tier2@finguru.dev'
                : 'farah.analyst@finguru.dev';
          switchTo(email);
        }}
        className="w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-xs text-on-surface outline-none focus:border-primary"
      >
        <option value="tier1_admin">Tier 1 Admin</option>
        <option value="tier2_admin">Tier 2 Admin</option>
        <option value="product_analyst">Product Analyst</option>
      </select>
    </div>
  );
}
