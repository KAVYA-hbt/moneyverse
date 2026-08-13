// Per-user progress for each mini-game: which difficulty level they've
// unlocked, how many times they've played, and their best result. Same
// localStorage convention as streakStorage.js / gameStorage.js.
//
// Shape stored per user:
// {
//   memory_match:    { unlockedLevel: 1, timesPlayed: 0, bestMoves: null },
//   pattern_sequence:{ unlockedLevel: 1, timesPlayed: 0, bestRound: null },
//   quick_sort:      { unlockedLevel: 1, timesPlayed: 0, bestRound: null },
// }

export const MINI_GAME_IDS = ['memory_match', 'pattern_sequence', 'quick_sort']
export const MAX_MINI_GAME_LEVEL = 5

function storageKey(sanitizedUser) {
  return `sbi_questcraft_minigames_${sanitizedUser}`
}

function defaultProgress() {
  return {
    memory_match: { unlockedLevel: 1, timesPlayed: 0, bestMoves: null },
    pattern_sequence: { unlockedLevel: 1, timesPlayed: 0, bestRound: null },
    quick_sort: { unlockedLevel: 1, timesPlayed: 0, bestRound: null },
  }
}

export function getMiniGameProgress(sanitizedUser) {
  try {
    const saved = localStorage.getItem(storageKey(sanitizedUser))
    if (!saved) return defaultProgress()
    const parsed = JSON.parse(saved)
    // Merge over defaults in case new games get added later — old saves
    // shouldn't crash on a missing key.
    return { ...defaultProgress(), ...parsed }
  } catch {
    return defaultProgress()
  }
}

function saveProgress(sanitizedUser, progress) {
  try {
    localStorage.setItem(storageKey(sanitizedUser), JSON.stringify(progress))
  } catch {
    // ignore storage errors
  }
}

/**
 * Call once when a mini-game session ends (win or lose).
 * - Always increments timesPlayed.
 * - On a WIN at the player's current unlocked level, bumps unlockedLevel
 *   by 1 (capped at MAX_MINI_GAME_LEVEL) — this is the actual difficulty
 *   progression the player experiences over repeated visits.
 * - Updates the best-score field if this run beat the previous best
 *   (lower moves/higher round = better, per game).
 */
export function recordMiniGameResult(sanitizedUser, gameId, { success, level, moves, round }) {
  const progress = getMiniGameProgress(sanitizedUser)
  const entry = progress[gameId]
  if (!entry) return progress

  entry.timesPlayed += 1

  if (success && level >= entry.unlockedLevel) {
    entry.unlockedLevel = Math.min(entry.unlockedLevel + 1, MAX_MINI_GAME_LEVEL)
  }

  if (gameId === 'memory_match' && typeof moves === 'number') {
    if (entry.bestMoves === null || moves < entry.bestMoves) entry.bestMoves = moves
  }
  if ((gameId === 'pattern_sequence' || gameId === 'quick_sort') && typeof round === 'number') {
    if (entry.bestRound === null || round > entry.bestRound) entry.bestRound = round
  }

  saveProgress(sanitizedUser, progress)
  return progress
}