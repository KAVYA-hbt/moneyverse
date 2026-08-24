import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// There is no login page: the app auto-authenticates as a seeded dev admin on
// boot (see AuthContext). This route gate now only covers the brief window
// while that silent login is in flight, and shows a clear error (instead of
// hanging forever) if the backend can't be reached.
export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping, bootstrapError, retryBootstrap } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">
            progress_activity
          </span>
          <p className="text-sm">Signing in to Admin Dashboard…</p>
        </div>
      </div>
    );
  }

  if (bootstrapError || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center ambient-shadow-md">
          <span className="material-symbols-outlined text-3xl text-error">error</span>
          <h2 className="text-lg font-semibold text-on-surface">Couldn't sign in</h2>
          <p className="text-sm text-on-surface-variant">
            {bootstrapError ?? 'Unable to establish a session.'}
          </p>
          <button
            onClick={retryBootstrap}
            className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-container"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
