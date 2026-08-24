import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useHandoffSocket } from '../hooks/useHandoffSocket';

export function DashboardLayout() {
  // Mounted once at shell level so the WS connection persists across
  // navigation between /handoffs and /handoffs/:caseId.
  useHandoffSocket();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-40 flex w-full shrink-0 items-center justify-between border-b border-outline-variant bg-surface px-4 py-3 shadow-sm md:px-6">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            className="p-1 text-on-surface-variant transition-colors hover:text-primary md:hidden"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="relative mr-1 hidden md:flex">
            <input
              type="text"
              placeholder="Search..."
              className="w-[220px] rounded-full border border-outline-variant bg-surface-container-lowest py-1.5 pl-9 pr-4 text-sm outline-none focus:border-primary-container focus:ring-2 focus:ring-inverse-primary"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
              search
            </span>
          </div>
          <button
            className="relative p-1 text-on-surface-variant transition-colors hover:text-primary"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-error" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-primary-container text-xs font-semibold text-on-primary-container">
            A
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {mobileNavOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-on-surface/20 md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="fixed left-0 top-[57px] z-40 h-[calc(100vh-57px)] shadow-lg md:hidden">
              <Sidebar onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
