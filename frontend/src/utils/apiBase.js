// Hardcoding "http://localhost:8000" only works when the browser and the
// backend are the SAME machine. The moment this page is opened from a
// different device on the network (e.g. a phone hitting
// http://10.6.16.52:5173/game while the backend runs on that same PC),
// "localhost" on the PHONE means the phone itself — nothing is listening
// on port 8000 there, so every API call silently fails and falls back to
// offline/generic behavior.
//
// Fix: derive the backend host from window.location.hostname, the actual
// host the page was loaded from, and keep the backend's own port (8000).
// This works identically whether accessed as localhost, a LAN IP, or (if
// ever deployed) a real domain.
export function getApiBaseUrl() {
  const host = window.location.hostname
  return `http://${host}:8000`
}