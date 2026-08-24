import { useEffect } from 'react'
import { getAdminDashboardUrl } from '../utils/adminBase'

// Deliberately not linked from anywhere in the game's own UI (LandingPage, nav, etc.) -- this
// route only exists for staff who already know the URL. It hands off to the separate
// admin_dashboard app (its own React/FastAPI project, own auth) rather than rendering any admin
// UI inside the game's bundle.
export default function AdminRedirect() {
  const adminUrl = getAdminDashboardUrl()

  useEffect(() => {
    window.location.replace(adminUrl)
  }, [adminUrl])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '12px',
        background: '#0f172a',
        color: '#e2e8f0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p>Redirecting to the admin dashboard…</p>
      <a href={adminUrl} style={{ color: '#7dd3fc' }}>
        Click here if you are not redirected automatically
      </a>
    </div>
  )
}
