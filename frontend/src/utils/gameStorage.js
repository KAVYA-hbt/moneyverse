// Retrieve the active user profile (returns the most recent profile from history)
export function getUserProfile() {
  const history = getAllUserProfiles()
  if (history.length > 0) {
    const latest = history[0]
    return {
      name: latest.name || 'Player',
      email: latest.email || 'demo@sbi.com',
      scenario: latest.scenario || 'student', // 'student' or 'employee'
      coins: latest.coins ?? 120,
      tasksCompleted: latest.tasksCompleted ?? 0,
      totalTasks: latest.totalTasks ?? 3,
      // Geolocation Fields
      state: latest.state || '',
      district: latest.district || '',
      // Avatar Selection
      selectedAvatar: latest.selectedAvatar || null,
      // Companion — saveUserProfile() writes these on unlock/naming, but
      // this whitelist previously never read them back out, silently
      // dropping the saved companion state on every reload and forcing
      // the unlock flow to run again even though the data was sitting
      // right there in localStorage the whole time.
      companionId: latest.companionId || null,
      companionName: latest.companionName || null,
      createdAt: latest.createdAt || new Date().toISOString(),
    }
  }

  // Default fallback if no profile exists yet
  return {
    name: 'Player',
    email: 'demo@sbi.com',
    scenario: 'student',
    coins: 120,
    tasksCompleted: 0,
    totalTasks: 3,
    state: '',
    district: '',
    selectedAvatar: null,
    companionId: null,
    companionName: null,
    createdAt: new Date().toISOString(),
  }
}

// Retrieve all historical user profiles/logs
export function getAllUserProfiles() {
  const saved = localStorage.getItem('user_game_profile_history')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      console.error('Failed to parse user profile history', e)
    }
  }

  // Fallback: check if an old single profile exists and migrate it into history format
  const single = localStorage.getItem('user_game_profile')
  if (single) {
    try {
      const parsed = JSON.parse(single)
      return [parsed]
    } catch (e) {
      // Ignore parse error
    }
  }

  return []
}

// Save profile by merging new fields into history log and notifying app components
export function saveUserProfile(profileData) {
  const existingHistory = getAllUserProfiles()
  const currentProfile = getUserProfile()

  const newProfileEntry = {
    ...currentProfile,
    ...profileData,
    updatedAt: new Date().toISOString(),
  }

  // Prepend the new profile entry to history log
  const updatedHistory = [newProfileEntry, ...existingHistory]

  localStorage.setItem('user_game_profile_history', JSON.stringify(updatedHistory))
  
  // Keep single active key updated for backward compatibility
  localStorage.setItem('user_game_profile', JSON.stringify(newProfileEntry))

  // Dispatch event so active components react dynamically to changes
  window.dispatchEvent(new Event('userProfileChanged'))

  return newProfileEntry
}

// Log game interactions specific to the active user's identity
export function logGameInteraction(actionType, details = {}) {
  const profile = getUserProfile()
  const userKey = profile.email || profile.name || 'Player'
  const storageKey = `game_interactions_${userKey}`

  const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]')

  const newLog = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    action: actionType, // e.g., 'ENTERED_BUILDING', 'TASK_COMPLETED'
    details: {
      ...details,
      scenario: profile.scenario,
      userLocation: { state: profile.state, district: profile.district },
    },
  }

  existingLogs.unshift(newLog)
  if (existingLogs.length > 100) existingLogs.pop() // Cap logs at 100 recent entries

  localStorage.setItem(storageKey, JSON.stringify(existingLogs))
  return existingLogs
}

// Retrieve action logs for the active user
export function getGameInteractions() {
  const profile = getUserProfile()
  const userKey = profile.email || profile.name || 'Player'
  const storageKey = `game_interactions_${userKey}`
  return JSON.parse(localStorage.getItem(storageKey) || '[]')
}