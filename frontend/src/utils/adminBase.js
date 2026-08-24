// Same LAN-safety reasoning as apiBase.js: derive the host from window.location.hostname
// instead of hardcoding "localhost", so this works whether the game is opened as localhost, a
// LAN IP, or (if ever deployed) a real domain. Only the port differs -- the separate
// admin_dashboard app's own frontend dev server (see admin_dashboard/frontend/.env,
// FRONTEND_PORT=5183).
export function getAdminDashboardUrl() {
  const host = window.location.hostname
  return `http://${host}:5183`
}
