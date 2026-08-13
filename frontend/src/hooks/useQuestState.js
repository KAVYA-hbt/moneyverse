import { useState, useEffect, useMemo, useCallback } from 'react'
import { getUserProfile } from '../utils/gameStorage'
import {
  QUEST_LABELS,
  QUEST_REWARDS,
  SCENARIO_CHAINS,
  getLevelInfo,
} from '../data/questCatalog'

const DEFAULT_REWARD = 20

function determineScenario(onboardingProfile) {
  if (!onboardingProfile) return 'student'
  const occupation = onboardingProfile.occupation_bracket
  if (occupation === 'entry_salary' || occupation === 'executive') return 'employee'
  return 'student'
}

// Generate a deterministic numeric seed from the user's name
function getUserSeed(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

// Distance from a building to the nearest road tile, used to bias quest
// building selection toward road-adjacent buildings so markers/labels don't
// end up floating deep inside a block, far from where the player walks.
function nearestRoadDistance(building, roads) {
  if (!roads || roads.length === 0 || building.render_x === undefined) return Infinity
  let min = Infinity
  for (const r of roads) {
    if (r.render_x === undefined) continue
    const d = Math.hypot(building.render_x - r.render_x, building.render_z - r.render_z)
    if (d < min) min = d
  }
  return min
}

/**
 * Dynamically selects quest buildings for the FULL 25-quest chain (all 5
 * levels), independent of how much progress the player has made — so a
 * building's position never shifts as the player levels up. Which of these
 * are actually shown/spawned in the world is controlled separately by
 * `visibleChain` in useQuestState, based on completed count.
 *
 * - Generates a unique sequence per user using their profile name seed.
 * - Applies a spatial filter to ensure selected destinations avoid straight-line clustering.
 * - Backend-tagged quest buildings (bank/aadhaar/pan/salary_slip) always
 *   claim their own matching quest id first, so e.g. the bank.glb building
 *   can never end up representing an unrelated quest topic; remaining ids
 *   are then filled from generic buildings, preferring ones closest to a
 *   road so quest markers stay near where the player actually walks.
 */
function pickDynamicQuestBuildings(layout, scenario, userName) {
  if (!layout || !layout.buildings || layout.buildings.length === 0) return { chain: [], questBuildings: {} }

  const allowedQuestIds = SCENARIO_CHAINS[scenario] || SCENARIO_CHAINS.student
  const numQuests = allowedQuestIds.length

  // Exclude any backend-tagged quest building that doesn't belong to this
  // scenario's chain (e.g. drop the "salary_slip" / Workplace building
  // entirely for students) so it can never be picked, no matter how the
  // shuffle lands.
  const scenarioEligibleBuildings = layout.buildings.filter(
    (b) => !b.quest_id || allowedQuestIds.includes(b.quest_id)
  )

  // 1. Spatial filter: Prevent straight-line clustering by enforcing minimum distance apart
  const diverseBuildings = []
  for (const b of scenarioEligibleBuildings) {
    if (b.category === 'road' || b.render_x === undefined || b.render_z === undefined) continue

    const tooCloseInLine = diverseBuildings.some(
      existing => Math.abs(existing.render_x - b.render_x) < 10 || Math.abs(existing.render_z - b.render_z) < 10
    )
    if (!tooCloseInLine) {
      diverseBuildings.push(b)
    }
  }

  const pool = diverseBuildings.length >= numQuests ? diverseBuildings : scenarioEligibleBuildings

  // 2. Seeded shuffle unique to the user's profile name
  const seed = getUserSeed(userName)
  const shuffled = [...pool].sort((a, b) => {
    const hashA = (seed * (Math.abs(a.render_x) + 7)) % 1000
    const hashB = (seed * (Math.abs(b.render_z) + 13)) % 1000
    return hashA - hashB
  })

  const questBuildings = {}

  // 3a. Backend-tagged buildings claim their own quest id first, regardless
  // of where they land in the shuffle — these are already guaranteed
  // road-adjacent by the backend's reserved quest row.
  for (const b of shuffled) {
    if (b.quest_id && allowedQuestIds.includes(b.quest_id) && !questBuildings[b.quest_id]) {
      questBuildings[b.quest_id] = b
    }
  }

  // 3b. Fill remaining unclaimed ids from the leftover buildings, but sort
  // those leftovers by proximity to the nearest road first — so generic
  // quest buildings (Local Store, City Hospital, and all Level 2-5 topics)
  // preferentially land near a road instead of buried inside a block. Ties
  // (equal road distance) keep the original seeded-shuffle order, so the
  // per-user variety from the shuffle isn't lost — only broken ties by
  // distance.
  const claimedRefs = new Set(Object.values(questBuildings))
  const roads = layout.roads || []
  const remainingSorted = shuffled
    .filter((b) => !claimedRefs.has(b))
    .map((b, idx) => ({ b, idx, dist: nearestRoadDistance(b, roads) }))
    .sort((x, y) => x.dist - y.dist || x.idx - y.idx)
    .map((entry) => entry.b)

  let cursor = 0
  for (const b of remainingSorted) {
    while (cursor < allowedQuestIds.length && questBuildings[allowedQuestIds[cursor]]) cursor++
    if (cursor >= allowedQuestIds.length) break
    questBuildings[allowedQuestIds[cursor]] = b
    cursor++
  }

  // Final chain always follows canonical catalog (level) order, and only
  // includes ids that actually got a building — degrades gracefully if a
  // very small generated world doesn't have 25 spare buildings.
  const chain = allowedQuestIds.filter((id) => questBuildings[id])

  return { chain, questBuildings }
}

export function useQuestState(layout, onboardingProfile) {
  const [scenarioOverride, setScenarioOverride] = useState(null)
  const scenario = scenarioOverride || determineScenario(onboardingProfile)

  const profile = getUserProfile()
  const userName = onboardingProfile?.name || profile?.name || 'Player'
  const sanitizedUser = userName.toLowerCase().replace(/\s+/g, '_')

  // Separate user-scoped storage keys to keep array parsing identical to your working code
  const COMPLETED_STORAGE_KEY = `sbi_questcraft_completed_${sanitizedUser}`
  const COINS_STORAGE_KEY = `sbi_questcraft_coins_${sanitizedUser}`

  // Dynamically generate unique, non-collinear quest chain per user (all 25,
  // stable regardless of progress)
  const { chain, questBuildings } = useMemo(
    () => pickDynamicQuestBuildings(layout, scenario, userName),
    [layout, scenario, userName]
  )

  // Exactly matches your working code's array parsing pattern
  const [completed, setCompleted] = useState(() => {
    try {
      const saved = localStorage.getItem(COMPLETED_STORAGE_KEY)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // Safely persist and load user-specific coins
  const [coins, setCoins] = useState(() => {
    try {
      const saved = localStorage.getItem(COINS_STORAGE_KEY)
      return saved ? Number(JSON.parse(saved)) : 0
    } catch {
      return 0
    }
  })

  const [lastReward, setLastReward] = useState(null)

  // Persist completed quests exactly as your working code did, but user-scoped
  useEffect(() => {
    try {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify([...completed]))
    } catch {
      // ignore storage errors
    }
  }, [COMPLETED_STORAGE_KEY, completed])

  // Persist coins user-scoped
  useEffect(() => {
    try {
      localStorage.setItem(COINS_STORAGE_KEY, JSON.stringify(coins))
    } catch {
      // ignore storage errors
    }
  }, [COINS_STORAGE_KEY, coins])

  const isComplete = useCallback((questId) => completed.has(questId), [completed])

  const levelInfo = useMemo(() => getLevelInfo(completed.size), [completed])

  // Only reveal quests up to and including the player's current level block
  // (5 per level), so future levels' buildings/markers don't spoil early or
  // spawn before they're reachable.
  const visibleChain = useMemo(
    () => chain.slice(0, Math.min(chain.length, levelInfo.level * 5)),
    [chain, levelInfo]
  )

  const isLocked = useCallback((questId) => {
    const idx = chain.indexOf(questId)
    if (idx <= 0) return false
    const prereqs = chain.slice(0, idx)
    return !prereqs.every((p) => completed.has(p))
  }, [chain, completed])

  const completeQuest = useCallback((questId) => {
    if (completed.has(questId)) return
    setCompleted((prev) => new Set(prev).add(questId))
    const reward = QUEST_REWARDS[questId] || DEFAULT_REWARD
    setCoins((prev) => prev + reward)
    setLastReward({ questId, amount: reward })
  }, [completed])

  const clearLastReward = useCallback(() => setLastReward(null), [])

  // Overwrites local completed-quests/coins with the server's saved state —
  // called once after fetching from the backend, so relogging in continues
  // exactly where the player left off instead of starting fresh.
  const hydrateFromServer = useCallback((serverState) => {
    if (!serverState) return
    if (Array.isArray(serverState.completed_quest_ids)) {
      setCompleted(new Set(serverState.completed_quest_ids))
    }
    if (typeof serverState.coins === 'number') {
      setCoins(serverState.coins)
    }
  }, [])

  return {
    scenario,
    chain,
    visibleChain,
    questBuildings,
    questLabels: QUEST_LABELS,
    isComplete,
    isLocked,
    completeQuest,
    coins,
    lastReward,
    clearLastReward,
    hydrateFromServer,
    setScenarioOverride,
    levelInfo,
  }
}