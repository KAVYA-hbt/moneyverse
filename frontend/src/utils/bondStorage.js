// Bond Meter — a running "helping nature" score, separate from coins.
// Grows from quest completions, treasure chests, and mini-game wins.
// Feeds two things not built yet: the badge system (Helping Nature score)
// and NPC recognition (Stage 4) — recognition should probably gate on
// Bond Meter reaching a threshold rather than raw quest count, since it's
// meant to reflect genuine engagement, not just progress.

function storageKey(sanitizedUser) {
  return `sbi_questcraft_bond_${sanitizedUser}`
}

export function getBondMeter(sanitizedUser) {
  try {
    const saved = localStorage.getItem(storageKey(sanitizedUser))
    return saved ? Number(saved) : 0
  } catch {
    return 0
  }
}

function saveBondMeter(sanitizedUser, value) {
  try {
    localStorage.setItem(storageKey(sanitizedUser), String(value))
  } catch {
    // ignore storage errors
  }
}

/** Adds `amount` to the player's Bond Meter and persists it. Returns the
 *  new total so callers can update their own state without a second read. */
export function incrementBondMeter(sanitizedUser, amount) {
  const next = getBondMeter(sanitizedUser) + amount
  saveBondMeter(sanitizedUser, next)
  return next
}

// Reward amounts per action — small and consistent, since this is meant
// to accumulate gradually over real engagement, not spike from any single
// action.
export const BOND_REWARDS = {
  quest: 5,
  treasure: 3,
  minigame: 2,
}