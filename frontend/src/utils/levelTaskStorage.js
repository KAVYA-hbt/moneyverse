// Persists levelTaskProgress ({ npcHelpCount, recognitionDone,
// minigameDone, capstoneDone }) so it survives a page refresh within the
// same level — previously this was pure React state with no persistence
// at all, so ANY progress on the current level's 5 task slots (not just
// mini-game) was silently lost on reload. Same localStorage convention
// as bondStorage.js / streakStorage.js / minigameStorage.js.
//
// Deliberately keyed per LEVEL, not just per user — advancing a level is
// already a real reset (GamePage.jsx's own level-change effect), so this
// only needs to survive refreshes WITHIN a level, not carry stale
// progress across one.

function storageKey(sanitizedUser, level) {
  return `sbi_questcraft_leveltasks_${sanitizedUser}_${level}`
}

function defaultProgress() {
  return {
    npcHelpCount: 0,
    recognitionDone: false,
    minigameDone: false,
    capstoneDone: false,
  }
}

export function getLevelTaskProgress(sanitizedUser, level) {
  try {
    const saved = localStorage.getItem(storageKey(sanitizedUser, level))
    if (!saved) return defaultProgress()
    return { ...defaultProgress(), ...JSON.parse(saved) }
  } catch {
    return defaultProgress()
  }
}

export function saveLevelTaskProgress(sanitizedUser, level, progress) {
  try {
    localStorage.setItem(storageKey(sanitizedUser, level), JSON.stringify(progress))
  } catch {
    // ignore storage errors
  }
}