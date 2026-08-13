import { getApiBaseUrl } from '../utils/apiBase.js'

/**
 * Minimal decoupled event dispatcher for behavioral telemetry.
 *
 * Gameplay code calls `emit(email, event)` and moves on immediately —
 * it never awaits the network call, never knows if it succeeded, and
 * never blocks a click handler or a render. Events are queued and
 * flushed in small batches so a burst of rapid interactions (e.g. a
 * player mashing through a quiz) doesn't fire N separate HTTP requests.
 *
 * This intentionally does NOT retry or persist across reloads — for
 * behavioral analytics, losing a rare event on a tab close is an
 * acceptable tradeoff against adding retry-queue complexity. Revisit
 * if these events become billing/audit-critical, not just analytical.
 */

const QUEUE = []
let flushTimer = null
const FLUSH_INTERVAL_MS = 2000
const MAX_BATCH = 20

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS)
}

async function flush() {
  flushTimer = null
  if (QUEUE.length === 0) return

  const batch = QUEUE.splice(0, MAX_BATCH)
  try {
    await fetch(`${getApiBaseUrl()}/api/telemetry/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true, // lets the request survive a page unload
    })
  } catch {
    // Deliberately silent — a dropped analytics batch should never
    // surface as a user-facing error or interrupt gameplay.
  }

  if (QUEUE.length > 0) scheduleFlush()
}

/**
 * @param {string} email - player identifier
 * @param {object} event - { type: string, payload: object }
 */
export function emitTelemetry(email, event) {
  QUEUE.push({
    email,
    type: event.type,
    payload: event.payload,
    client_ts: Date.now(),
  })
  scheduleFlush()
}

// Best-effort flush on tab close so the last batch isn't silently lost.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (QUEUE.length > 0) flush()
  })
}