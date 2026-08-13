// Daily login streak + streak-freezer inventory, stored per user in
// localStorage the same way coins/completed quests already are.
//
// Rules:
// - First ever visit: streak = 1, today recorded as last played.
// - Same day as last visit: no change.
// - Exactly one day since last visit: streak += 1.
// - More than one day gap: if a freezer is available, consume one and KEEP
//   the streak alive; otherwise the streak resets to 1.

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(`${dateStrA}T00:00:00`)
  const b = new Date(`${dateStrB}T00:00:00`)
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

function storageKey(sanitizedUser) {
  return `sbi_questcraft_streak_${sanitizedUser}`
}

function readRaw(sanitizedUser) {
  try {
    const saved = localStorage.getItem(storageKey(sanitizedUser))
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function writeRaw(sanitizedUser, state) {
  try {
    localStorage.setItem(storageKey(sanitizedUser), JSON.stringify(state))
  } catch {
    // ignore storage errors
  }
}

/**
 * Call once per session load. Returns { count, freezers, freezerConsumed }.
 * freezerConsumed is true if a freezer was just spent to protect the streak,
 * so the UI can show a one-time "Freezer used!" notice if desired.
 */
export function syncDailyStreak(sanitizedUser) {
  const today = todayKey()
  const existing = readRaw(sanitizedUser)

  if (!existing) {
    const fresh = { count: 1, freezers: 0, lastPlayed: today }
    writeRaw(sanitizedUser, fresh)
    return { count: fresh.count, freezers: fresh.freezers, freezerConsumed: false }
  }

  const gap = daysBetween(existing.lastPlayed, today)

  if (gap === 0) {
    return { count: existing.count, freezers: existing.freezers || 0, freezerConsumed: false }
  }

  if (gap === 1) {
    const updated = { ...existing, count: existing.count + 1, lastPlayed: today }
    writeRaw(sanitizedUser, updated)
    return { count: updated.count, freezers: updated.freezers || 0, freezerConsumed: false }
  }

  // gap > 1: streak would break unless a freezer covers it
  if ((existing.freezers || 0) > 0) {
    const updated = { ...existing, freezers: existing.freezers - 1, lastPlayed: today }
    writeRaw(sanitizedUser, updated)
    return { count: updated.count, freezers: updated.freezers, freezerConsumed: true }
  }

  const reset = { count: 1, freezers: existing.freezers || 0, lastPlayed: today }
  writeRaw(sanitizedUser, reset)
  return { count: reset.count, freezers: reset.freezers, freezerConsumed: false }
}

export function addStreakFreezer(sanitizedUser, amount = 1) {
  const today = todayKey()
  const existing = readRaw(sanitizedUser) || { count: 1, freezers: 0, lastPlayed: today }
  const updated = { ...existing, freezers: (existing.freezers || 0) + amount }
  writeRaw(sanitizedUser, updated)
  return updated.freezers
}
