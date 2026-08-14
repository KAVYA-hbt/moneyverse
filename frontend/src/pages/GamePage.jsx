import { Canvas } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import { Suspense, useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as THREE from 'three'

import { getDiscoveredModels } from '../utils/modelDiscovery.js'
import { getUserProfile, saveUserProfile } from '../utils/gameStorage.js'
import PlayerController from '../components/PlayerController.jsx'
import { useQuestState } from '../hooks/useQuestState.js'
import { useNearbyInteractable } from '../components/InteractionSystem.jsx'
import QuestBuildingBanners from '../components/QuestBuildingBanners.jsx'
import CheckpointRing from '../components/CheckpointRing.jsx'
import CheckpointBurst from '../components/CheckpointBurst.jsx'

// Separate Real Leaderboard Component
import LeaderboardCard from '../components/game/LeaderboardCard.jsx'

// Interactive Components & Questions Data
import { FloatingGenieIcon } from '../components/game/FloatingGenieIcon.jsx'
import { QuestQuizModal } from '../components/game/QuestQuizModal.jsx'
import { PathCollectible } from '../components/game/PathCollectible.jsx'
import { ObjectiveArrows } from '../components/game/ObjectiveArrows.jsx'
import { generateQuizFromBackend } from '../services/quizService.js'
import { syncDailyStreak, addStreakFreezer } from '../utils/streakStorage.js'
import { getBondMeter, incrementBondMeter, BOND_REWARDS } from '../utils/bondStorage.js'
import { getLevelTaskProgress, saveLevelTaskProgress } from '../utils/levelTaskStorage.js'
import { useAdvisoryConversation } from '../hooks/useAdvisoryConversation.js'
import AdvisoryConversationModal from '../components/game/AdvisoryConversationModal.jsx'
import { QUEST_META } from '../data/questCatalog.js'
import { pickAdvisoryTopicForLevel, LEVEL_CAPSTONE_QUESTS } from '../data/levelTasks.js'
import { syncPlayer, collectTreasureOnServer } from '../services/backendSync.js'
import { getApiBaseUrl } from '../utils/apiBase.js'
import { MobileControls } from '../components/game/MobileControls.jsx'
import CompanionWorldModel from '../components/game/CompanionWorldModel.jsx'
import MiniGameHub from '../components/game/minigames/MiniGameHub.jsx'
import CompanionDialogueModal from '../components/game/CompanionDialogueModal.jsx'
import BadgeModal from '../components/game/BadgeModal.jsx'
import { emitTelemetry } from '../telemetry/telemetryBus.js'
import { useCompanionNarrative } from '../hooks/useCompanionNarrative.js'
import { useCompanionNudge } from '../hooks/useCompanionNudge.js'
import { useStoryNarrator } from '../hooks/useStoryNarrator.js'
import LoadingScreen from '../components/game/LoadingScreen.jsx'
import GuidePanel from '../components/game/GuidePanel.jsx'
import NoticeBoard from '../components/game/NoticeBoard.jsx'
import npcPortrait1 from '../assets/npc/npc_1.png'
import npcPortrait2 from '../assets/npc/npc_2.png'
import npcPortrait3 from '../assets/npc/npc_3.jpg'
import npcPortrait4 from '../assets/npc/npc_4.jpg'
import npcPortrait5 from '../assets/npc/npc_5.png'
import IntroTourOverlay from '../components/game/IntroTourOverlay.jsx'
import { useIntroTour } from '../hooks/useIntroTour.js'
import { cdnUrl } from '../config/assetCdn.js'

// Only Robot is usable right now — the other 3 companion models have a
// source-file problem (see chat) that repeated code-side fixes couldn't
// fully resolve. Simplified to a single fixed companion rather than a
// picker screen; if/when the other files are fixed, this can go back to a
// real choice.
const ROBOT_COMPANION = {
  id: 'companion_robot',
  name: 'Robot',
  url: cdnUrl('companion/Robot.fbx'),
}
import WanderingNPC from '../components/game/WanderingNPC.jsx'
import FixedStoryNPC from '../components/game/FixedStoryNPC.jsx'
import ModelErrorBoundary from '../components/game/ModelErrorBoundary.jsx'
import { AVATARS } from './UserDetailsPage.jsx'
import { useGameAudio } from '../hooks/useGameAudio.js'

import './GamePage.css'

export const ROAD_SURFACE_HEIGHT = 0.17

// Ground-arrow / minimap accent colours, keyed by objective. Kept in one
// place so the trail on the ground and the marker on the map always agree.
const OBJECTIVE_COLORS = { companion: '#8b5cf6', minigame: '#22d3ee', capstone: '#F2A93B' }

function PlacedObject({ item, urlByFilename }) {
  const url = urlByFilename[item.filename]
  const { scene } = useGLTF(url)

  const isRoad = item.category === 'road'
  const isOnStreet = item.category === 'vehicle' || item.category === 'prop'

  const yOffset = isRoad
    ? 0.01
    : isOnStreet
    ? ROAD_SURFACE_HEIGHT
    : 0

  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true)

    cloned.traverse((child) => {
      if (child.isLight || (child.type && child.type.toLowerCase().includes('light'))) {
        child.intensity = 0
        child.visible = false
      }

      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true

        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material]

        const clonedMaterials = materials.map((mat) => {
          if (!mat) return mat
          const clonedMat = mat.clone()

          if (clonedMat.emissive) {
            clonedMat.emissive.setHex(0x000000)
            clonedMat.emissiveIntensity = 0
          }

          if (clonedMat.metalness > 0.05) {
            clonedMat.metalness = 0
            clonedMat.roughness = Math.max(clonedMat.roughness, 0.8)
          }

          return clonedMat
        })

        child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0]
      }
    })

    return cloned
  }, [scene])

  return (
    <primitive
      object={clonedScene}
      position={[
        item.render_x,
        (item.render_y || 0) + yOffset,
        item.render_z,
      ]}
      rotation={[
        0,
        ((item.rotation_y || 0) * Math.PI) / 180,
        0,
      ]}
      scale={item.scale_correction}
    />
  )
}

function City({ layout, urlByFilename }) {
  const allItems = useMemo(() => [
    ...(layout?.buildings || []),
    ...(layout?.roads || []),
    ...(layout?.parking || []),
  ], [layout])

  return allItems.map((item, i) => (
    <PlacedObject
      key={`${item.filename}-${i}`}
      item={item}
      urlByFilename={urlByFilename}
    />
  ))
}

function Ground({ bounds }) {
  const MARGIN = 120
  const width = bounds.maxX - bounds.minX + MARGIN * 2
  const depth = bounds.maxZ - bounds.minZ + MARGIN * 2
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2

  return (
    <group position={[centerX, -0.05, centerZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#415e41" roughness={0.85} metalness={0.1} />
      </mesh>

      <mesh position={[0, -5, 0]}>
        <boxGeometry args={[width, 10, depth]} />
        <meshBasicMaterial color="#1a2e1a" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function QuestProximityManager({ playerPosRef, questState, onNearbyChange }) {
  const nearby = useNearbyInteractable(playerPosRef, questState)

  useEffect(() => {
    onNearbyChange(nearby)
  }, [nearby, onNearbyChange])

  return null
}

export default function GamePage() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const savedProfile = getUserProfile()

  const profile = useMemo(() => {
    const active = state?.profile || savedProfile
    if (active) {
      return {
        name: active.name || 'Player',
        email: active.email || 'demo@example.com',
        scenario: active.scenario || 'student',
        state: active.state || '',
        district: active.district || '',
        coins: active.coins ?? 120,
        companionId: active.companionId || null,
        companionName: active.companionName || null,
      }
    }
    return {
      name: 'Player',
      email: 'demo@example.com',
      scenario: 'student',
      state: '',
      district: '',
      coins: 120,
      companionId: null,
      companionName: null,
    }
  }, [state?.profile, savedProfile])

  const selectedAvatar = state?.selectedAvatar ?? savedProfile?.selectedAvatar ?? {
    name: 'Default Avatar',
    url: ''
  }

  const [layout, setLayout] = useState(null)
  // Guarantees the loading screen shows for at least this long even when the
  // layout fetch resolves almost instantly (e.g. a fast local backend) —
  // otherwise it can flash for a few milliseconds and be imperceptible.
  // Only matters for a first-time player -- see hasEnteredGame below,
  // which skips LoadingScreen (and therefore this timer) entirely for
  // anyone who's already launched once before.
  const [minLoadingTimeElapsed, setMinLoadingTimeElapsed] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setMinLoadingTimeElapsed(true), 20000)
    return () => clearTimeout(timer)
  }, [])
  // True only once the city layout has actually arrived AND the minimum
  // crawl-watching time has passed. The intro button stays disabled until
  // this flips true, so tapping it can never drop the player into the
  // game page before loading is strictly finished.
  const assetsReady = !!layout && minLoadingTimeElapsed

  // --- Shareable badge queue -----------------------------------------
  // Badges are queued (not shown immediately/simultaneously) so that a
  // quest completion + a mini-game finishing back-to-back don't stack
  // two modals on top of each other -- they show one at a time, in the
  // order they were earned. shownBadgeIdsRef stops the same badge id
  // from ever being queued twice in one session (e.g. a re-render
  // re-running an effect shouldn't re-queue "Helped Riya!").
  const [badgeQueue, setBadgeQueue] = useState([])
  const shownBadgeIdsRef = useRef(new Set())
  const activeBadge = badgeQueue[0] ?? null

  const queueBadge = useCallback((badge) => {
    if (shownBadgeIdsRef.current.has(badge.id)) return
    shownBadgeIdsRef.current.add(badge.id)
    setBadgeQueue((q) => [...q, badge])
  }, [])

  const closeBadge = useCallback(() => {
    setBadgeQueue((q) => q.slice(1))
  }, [])

  const handleBadgePublished = useCallback((badgeId, badgeName) => {
    emitTelemetry(profile.email, {
      type: 'badge_published',
      payload: { badge_id: badgeId, name_on_badge: badgeName, level: currentLevel },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Post product-funnel "Onboard" CTA ------------------------------
  // A small, non-blocking call-to-action that appears once the player has
  // actually read (tapped through) the companion's product-funnel
  // response line -- see fireProductFunnelCheckin below, which passes a
  // completion callback into that beat specifically to flip this on at
  // the right moment rather than guessing with a timer.
  const [showOnboardCta, setShowOnboardCta] = useState(false)
  const handleOnboardClick = useCallback(() => {
    emitTelemetry(profile.email, {
      type: 'onboard_cta_click',
      payload: { level: currentLevel },
    })
    setShowOnboardCta(false)
    navigate('/onboard')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])
  // Companion flow state machine — Robot spawns automatically as soon as
  // GamePage loads (no picker screen, this IS the first task, discoverable
  // in-world exactly like any quest). 'placed' (dead, on the road, player
  // walks over freely, movement never locked) -> 'repairing' (tap
  // mini-game, small on-screen card, NOT full-screen — avatar and
  // companion both stay visible) -> 'repaired' (waves, naming card shown)
  // -> 'done' (stays in place, holding its waved pose, as a permanent
  // world landmark). Returning players (savedProfile already has a
  // companionId) skip straight to 'done'.
  const [companionPhase, setCompanionPhase] = useState(() =>
    savedProfile?.companionId ? 'done' : 'placed'
  )
  const [selectedCompanionData] = useState(ROBOT_COMPANION)
  // The unlock puzzle — a short 4-tile sequence the player watches, then
  // repeats back, replacing the old plain tap-counter. Generated fresh
  // each time the companion becomes interactable.
  const [unlockSequence, setUnlockSequence] = useState([])
  const [unlockPlayerIndex, setUnlockPlayerIndex] = useState(0)
  const [unlockLitTile, setUnlockLitTile] = useState(null)
  const [unlockPhase, setUnlockPhase] = useState('showing') // 'showing' | 'input'
  const [companionNameInput, setCompanionNameInput] = useState('')
  const [miniGameHubOpen, setMiniGameHubOpen] = useState(false)
  const narrative = useCompanionNarrative()
  // Ambient, non-blocking guidance ("head to Arjun", "follow the arrow",
  // "nice work on that one") — floats above the companion instead of the
  // full-width modal narrative uses, and never needs a tap to dismiss.
  // See useCompanionNudge.js for why these are kept separate from
  // narrative beats that actually need a decision.
  const companionNudge = useCompanionNudge()
  const advisoryConversation = useAdvisoryConversation()
  // Stage 2 fires ONCE, on the player's very first quest — an onboarding
  // moment, not something that should repeat on quest #2 through #25.
  const hasShownFirstQuestApproachRef = useRef(false)
  const hasShownFirstQuestOutcomeRef = useRef(false)
  const [nearbyQuest, setNearbyQuest] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileTrackerOpen, setMobileTrackerOpen] = useState(false)
  const [minimapExpanded, setMinimapExpanded] = useState(false)
  const [guidePanelOpen, setGuidePanelOpen] = useState(false)
  const [noticeBoardOpen, setNoticeBoardOpen] = useState(false)
  const [showNoticeBoardArrow, setShowNoticeBoardArrow] = useState(false)
  const [pinnedTaskId, setPinnedTaskId] = useState(null)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [topBarCollapsed, setTopBarCollapsed] = useState(false)
  // Any of these being open means the player's attention is on a UI
  // panel, not the 3D world — every world-interaction icon/toast
  // (treasure chests, mini-game hub, capstone) and the idle-guidance
  // nudges all check this before showing anything, so nothing floats on
  // top of an open panel.
  const anyPanelOpen = drawerOpen || mobileTrackerOpen || minimapExpanded ||
    guidePanelOpen || noticeBoardOpen || leaderboardOpen || miniGameHubOpen
  const [activeEffect, setActiveEffect] = useState(null)
  const [systemNotice, setSystemNotice] = useState(null)
  const [levelUpInfo, setLevelUpInfo] = useState(null) // { level, title } | null, while the level-up animation is showing

  const [collectedCoinIds, setCollectedCoinIds] = useState(new Set())
  const [bonusCoins, setBonusCoins] = useState(0)

  const [activeQuiz, setActiveQuiz] = useState(null)
  const [activeQuestId, setActiveQuestId] = useState(null)
  const [activeTreasureId, setActiveTreasureId] = useState(null)
  const [activeNpcAdvisory, setActiveNpcAdvisory] = useState(null) // { name } | null
  const [activeCapstone, setActiveCapstone] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)

  const sanitizedUser = useMemo(
    () => (profile?.name || 'player').toLowerCase().replace(/\s+/g, '_'),
    [profile?.name]
  )

  const storyNarrator = useStoryNarrator(sanitizedUser)
  const introTour = useIntroTour(sanitizedUser)
  const [bondMeter, setBondMeter] = useState(() => getBondMeter(sanitizedUser))

  // The intro crawl/joystick-tutorial screen (LoadingScreen) is meant as
  // a one-time "how to play" moment, not a loading spinner shown on every
  // visit -- so it only ever renders for a player who's never gotten
  // past it before. Checked synchronously via useState's initializer
  // (not an effect) so this is already known on the very first render,
  // before LoadingScreen would otherwise flash on screen for a returning
  // player.
  const hasLaunchedBeforeRef = useRef(false)
  const [hasEnteredGame, setHasEnteredGame] = useState(() => {
    try {
      const launched = localStorage.getItem(`sbi_questcraft_has_launched_${sanitizedUser}`) === 'true'
      hasLaunchedBeforeRef.current = launched
      return launched
    } catch {
      return false
    }
  })

  // Marks "seen" the moment the crawl actually APPEARS, not only once the
  // player finishes it. It used to save only inside LoadingScreen's
  // onEnter (the "Start Your Journey" tap) -- so refreshing partway
  // through the ~20s minimum wait (before ever reaching that button)
  // meant the flag never got written, and the very next load showed the
  // exact same first-time crawl again, every time. A single viewing --
  // even one cut short by a refresh -- is now enough to skip it going
  // forward.
  useEffect(() => {
    if (hasEnteredGame) return
    try {
      localStorage.setItem(`sbi_questcraft_has_launched_${sanitizedUser}`, 'true')
    } catch {
      // localStorage unavailable (private browsing, etc.) -- not fatal,
      // it just means the crawl may show again next time.
    }
  }, [hasEnteredGame, sanitizedUser])

  // New per-level task progress — tracks the NEW 5-task structure
  // (npc-help x1-3, recognition [L1 only], mini-game, capstone) shown to
  // the player. Kept entirely separate from questState's own completed-
  // quest tracking; see the mapping/silent-completion logic further down
  // for how the two stay in sync so coins/levels/badges keep working
  // through the same tested engine as before.
  const [levelTaskProgress, setLevelTaskProgress] = useState({
    npcHelpCount: 0,
    completedNpcIds: [],
    completedMinigameIds: [],
    recognitionDone: false,
    minigameDone: false,
    capstoneDone: false,
  })

  const addBond = useCallback((amount) => {
    setBondMeter(incrementBondMeter(sanitizedUser, amount))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanitizedUser])

  // Small tutorial-style highlight arrow pointing at the notice board
  // trigger (checklist item #6) -- fired once at spawn (after the
  // opening narration/greeting) and again after every task completion,
  // 3 seconds each time. A single ref-tracked timeout so overlapping
  // triggers (e.g. two tasks completing in quick succession) restart
  // the 3-second window cleanly instead of stacking multiple timers.
  const noticeBoardArrowTimeoutRef = useRef(null)
  const triggerNoticeBoardArrow = useCallback(() => {
    clearTimeout(noticeBoardArrowTimeoutRef.current)
    setShowNoticeBoardArrow(true)
    noticeBoardArrowTimeoutRef.current = setTimeout(() => setShowNoticeBoardArrow(false), 3000)
  }, [])

  const [hintScrolls, setHintScrolls] = useState(() => {
    try {
      const saved = localStorage.getItem(`sbi_questcraft_hints_${sanitizedUser}`)
      return saved ? Number(saved) : 1
    } catch {
      return 1
    }
  })

  // Kept in sync so the level-up effect (below) can read the CURRENT
  // hint count at the exact moment a level completes, without needing
  // hintScrolls in its own dependency array (which would re-fire that
  // effect, with its side effects, on every single hint use).
  useEffect(() => {
    hintScrollsRef.current = hintScrolls
  }, [hintScrolls])

  const [collectedTreasureIds, setCollectedTreasureIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`sbi_questcraft_treasures_${sanitizedUser}`)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const [streakInfo, setStreakInfo] = useState({ count: 0, freezers: 0 })

  // This will prevent audio from playing while the server syncs
  const isGameReadyRef = useRef(false)

  // Tracks how well the player did THIS level, so the level's badge can
  // show a real "Trust score" rather than a made-up number -- reset every
  // time a new level begins (see the level-up effect below). Fast +
  // accurate (no hints, finished within the target time) scores 100;
  // score never drops below 80 for anyone who actually completes the
  // level -- slower/hint-heavy play is graded down from there, not
  // penalized below that floor.
  const levelStartTimeRef = useRef(null)
  const levelStartHintsRef = useRef(null)
  const hintScrollsRef = useRef(0)

  // Repeats the notice board arrow every 5 seconds until the player has
  // opened it at least once -- the one-shot flashes (spawn + per-task)
  // are easy to miss if you're not looking right at that moment; this
  // keeps nudging without becoming permanent nagging, since it stops
  // for good the first time the board is actually opened.
  const hasEverOpenedNoticeBoardRef = useRef(false)
  useEffect(() => {
    if (noticeBoardOpen) hasEverOpenedNoticeBoardRef.current = true
  }, [noticeBoardOpen])
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isGameReadyRef.current || hasEverOpenedNoticeBoardRef.current) return
      triggerNoticeBoardArrow()
    }, 5000)
    return () => clearInterval(interval)
  }, [triggerNoticeBoardArrow])

  // Guards against a stale async response applying itself after the
  // player has navigated away or the component has otherwise unmounted —
  // see handleNpcAdvisory below, the one confirmed real trigger for this
  // (its backend round-trip can outlive a quick re-approach/refresh).
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Served from frontend/public/audio/ — plain URL strings instead of
  // build-time imports, so a missing/renamed file just plays silence with
  // a console warning instead of crashing the entire Vite dev server (as
  // happened when the level-up file turned out to be .ogg, not .mp3, and
  // was still sitting in src/assets rather than public/).
  const { isMuted, toggleMute, playSuccessSound, playRewardSound } = useGameAudio('/audio/bgm.mp3')

  useEffect(() => {
    try {
      localStorage.setItem(`sbi_questcraft_hints_${sanitizedUser}`, String(hintScrolls))
    } catch {
      // ignore storage errors
    }
  }, [sanitizedUser, hintScrolls])

  useEffect(() => {
    try {
      localStorage.setItem(`sbi_questcraft_treasures_${sanitizedUser}`, JSON.stringify([...collectedTreasureIds]))
    } catch {
      // ignore storage errors
    }
  }, [sanitizedUser, collectedTreasureIds])

  // Sync the daily login streak once per mount. If a gap was covered by a
  // streak freezer, briefly surface that so it doesn't look like a silent
  // inventory change.
  useEffect(() => {
    const result = syncDailyStreak(sanitizedUser)
    setStreakInfo({ count: result.count, freezers: result.freezers })
    if (result.freezerConsumed) {
      setSystemNotice('❄️ A Streak Freezer protected your streak!')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sanitizedUser])



  // Stage 2: fires once, the first time the player approaches ANY quest —
  // only meaningful once the companion is actually repaired (companionPhase
  // 'done'), so this never overlaps with the repair/naming cards.
  useEffect(() => {
    if (
      nearbyQuest?.label &&
      companionPhase === 'done' &&
      !hasShownFirstQuestApproachRef.current &&
      !narrative.isActive
    ) {
      hasShownFirstQuestApproachRef.current = true
      companionNudge.show('first_quest_approach', { questLabel: nearbyQuest.label })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyQuest, companionPhase])

  useEffect(() => {
    if (!systemNotice) return
    const timer = setTimeout(() => setSystemNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [systemNotice])

  // Best-effort auto-fullscreen + landscape lock as soon as GamePage mounts
  // (i.e. right after "Start Journey" navigates here). Browsers only honor
  // requestFullscreen() when it's traceable to a real user gesture — since
  // React Router's client-side navigate() often runs inside the same click
  // handler that triggered it, this frequently still works, but isn't
  // guaranteed on every browser. If it's blocked, it fails silently here —
  // the rotate/fullscreen prompt below is the reliable fallback either way.
  useEffect(() => {
    const tryAutoFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen()
        }
        if (screen.orientation && screen.orientation.lock) {
          await screen.orientation.lock('landscape')
        }
      } catch {
        // Expected on many browsers — the rotate overlay's manual button
        // covers this case, so no need to surface anything here.
      }
    }
    tryAutoFullscreen()
  }, [])

  const playerPosRef = useRef(null)
  const [playerPos, setPlayerPos] = useState(null)
  const lastStateUpdateRef = useRef(0)

  const handlePositionChange = useCallback((pos) => {
    playerPosRef.current = pos

    const now = performance.now()
    if (now - lastStateUpdateRef.current > 100) {
      lastStateUpdateRef.current = now
      setPlayerPos(pos)
    }
  }, [])

  // Live NPC positions, updated every 3D frame via WanderingNPC's
  // position-reporting hook — kept in a plain ref (not state) since it
  // changes far too often to trigger re-renders; proximity is instead
  // recomputed reactively further below whenever playerPos itself updates
  // (already throttled to ~10x/sec above). The proximity/interact logic
  // itself lives further down, after backgroundNpcAvatars is declared.
  const npcPositionsRef = useRef(new Map())
  const handleNpcPositionUpdate = useCallback((id, pos) => {
    if (id) npcPositionsRef.current.set(id, pos)
  }, [])

  const questState = useQuestState(layout, profile)

  // Maps a new-system task "slot" to the real underlying chain quest id
  // for the CURRENT level, so completing it there silently drives the
  // existing coin/level/badge engine — index-based, so it doesn't care
  // what the old quest ids are actually named per scenario.
  const currentLevel = questState.levelInfo.level
  const levelChainSlice = questState.chain.slice((currentLevel - 1) * 5, currentLevel * 5)
  const getTaskChainId = useCallback((slotIndex) => levelChainSlice[slotIndex], [levelChainSlice])
  const NPC_HELP_QUOTA = currentLevel === 1 ? 1 : 3

  // Level 1's exact required order (per explicit request) -- companion
  // repair, then Arjun specifically, then Memory Match specifically,
  // then Cash Flow Catch specifically, then Riya specifically. Meera and
  // the other 2 mini-games are NOT part of this required chain; they
  // stay interactable (bonus content) but don't advance this sequence.
  // Only applies to level 1 -- other levels keep the existing flexible
  // "any N of the pool" system unless told otherwise.
  const LEVEL_1_SEQUENCE = useMemo(() => ['companion', 'arjun', 'memory_match', 'cash_flow_catch', 'riya'], [])
  const LEVEL_1_SEQUENCE_LABELS = useMemo(() => ({
    companion: 'fixing my companion',
    arjun: "helping Arjun",
    memory_match: 'the Memory Match game',
    cash_flow_catch: 'the Cash Flow Catch game',
    riya: 'helping Riya',
  }), [])

  const level1NextRequiredStep = useMemo(() => {
    if (currentLevel !== 1) return null
    if (companionPhase !== 'done') return 'companion'
    if (!(levelTaskProgress.completedNpcIds || []).includes('arjun')) return 'arjun'
    if (!(levelTaskProgress.completedMinigameIds || []).includes('memory_match')) return 'memory_match'
    if (!(levelTaskProgress.completedMinigameIds || []).includes('cash_flow_catch')) return 'cash_flow_catch'
    if (!(levelTaskProgress.completedNpcIds || []).includes('riya')) return 'riya'
    return null // sequence complete
  }, [currentLevel, companionPhase, levelTaskProgress.completedNpcIds, levelTaskProgress.completedMinigameIds])

  // Safety-net reconciliation, one-shot per level: the per-event handlers
  // above only write a chain slot the moment a task is FRESHLY completed,
  // so a save made before this 5-slot remapping existed (or any other way
  // a slot got skipped) can leave the notice board showing the sequence
  // as fully done locally while questState's real completed-quest count
  // never actually reached 5 -- meaning the level never flips and the
  // level-up banner/badge/product-funnel check-in never fire, even though
  // the board reads 100%. Once level1NextRequiredStep says the sequence
  // is genuinely done, force-complete all 5 slots directly; completeQuest()
  // already no-ops on an id that's already in the set, so this is harmless
  // even when everything was already correctly in sync.
  const reconciledLevel1Ref = useRef(false)
  useEffect(() => {
    if (currentLevel !== 1 || level1NextRequiredStep !== null) return
    if (reconciledLevel1Ref.current) return
    reconciledLevel1Ref.current = true
    for (let i = 0; i < 5; i++) {
      const chainId = getTaskChainId(i)
      if (chainId) questState.completeQuest(chainId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel, level1NextRequiredStep])


  // Hydrates task progress for whatever the current level actually is —
  // for a level never visited before, storage naturally has nothing
  // saved and this correctly returns all-zero (the old "reset on level
  // change" behavior). For the SAME level after a refresh, this
  // correctly restores whatever was saved instead of the previous
  // hardcoded-zero useState default, which had no persistence at all —
  // any progress on npcHelpCount/recognitionDone/minigameDone/
  // capstoneDone was silently lost on every reload, not just mini-game.
  useEffect(() => {
    setLevelTaskProgress(getLevelTaskProgress(sanitizedUser, currentLevel))
  }, [currentLevel, sanitizedUser])

  // Single choke point that persists levelTaskProgress on every change,
  // regardless of which of the several call sites updated it — avoids
  // repeating the exact mistake that caused the completeQuest bug
  // (remembering to add a save call at every scattered mutation site).
  const hasHydratedTaskProgressRef = useRef(false)
  useEffect(() => {
    // Skip the very first run — that's this effect firing right after
    // the hydrate-effect above just SET this same state from storage,
    // so persisting it again immediately would be a redundant no-op
    // write, not a real update to save.
    if (!hasHydratedTaskProgressRef.current) {
      hasHydratedTaskProgressRef.current = true
      return
    }
    saveLevelTaskProgress(sanitizedUser, currentLevel, levelTaskProgress)
    // Points the notice board arrow at the next task right after any
    // task genuinely completes -- deliberately in this same
    // post-hydration branch so it never fires on the initial load when
    // progress is merely being restored from storage, only on a real
    // completion during play.
    triggerNoticeBoardArrow()
  }, [levelTaskProgress, sanitizedUser, currentLevel, triggerNoticeBoardArrow])

  // The old chain/building system still detects proximity to EVERY
  // unlocked incomplete quest in the chain (see InteractionSystem.jsx) —
  // rather than touch that shared hook, this filters its output down to
  // ONLY the current level's capstone slot. Every other slot (now
  // completed via companion/npc-help/recognition/mini-game instead of
  // walking to a building) is treated as "nothing nearby" here, even if
  // the raw hook still technically detects proximity to it.
  const capstoneChainId = getTaskChainId(4)
  const effectiveNearbyQuest = nearbyQuest?.questId === capstoneChainId ? nearbyQuest : null

  // Fires ONCE per level — a delay after the level-up dialogue so it
  // never overlaps with the companion's "you're an Explorer now" line.
  // Not gated by useCompanionNarrative itself (that hook has no built-in
  // "already seen" tracking, it's meant to be called deliberately) — this
  // ref tracks which levels have already gotten a check-in this session.
  const checkedInLevelsRef = useRef(new Set())
  const fireProductFunnelCheckin = useCallback((level) => {
    if (checkedInLevelsRef.current.has(level)) return
    checkedInLevelsRef.current.add(level)
    narrative.play('product_funnel_checkin', {}, (value) => {
      // The completion callback here fires once the player has actually
      // tapped through the response line (see useCompanionNarrative's
      // advance()) -- not on a blind timer -- so the Onboard CTA appears
      // right after they've read it, whichever of the four options they picked.
      narrative.play(`product_funnel_response_${value}`, {}, () => {
        setShowOnboardCta(true)
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fires the level-up animation whenever the player's level actually
  // increases during THIS session — not on initial load (so returning
  // players with saved progress at, say, Level 3 don't see a "LEVEL UP"
  // banner just because the page loaded there).
  const previousLevelRef = useRef(null)
  const previousTitleRef = useRef(null)
  useEffect(() => {
    const currentLevel = questState.levelInfo.level
    const currentTitle = questState.levelInfo.title

    if (previousLevelRef.current === null) {
      previousLevelRef.current = currentLevel
      previousTitleRef.current = currentTitle
      return
    }

    if (isGameReadyRef.current && currentLevel > previousLevelRef.current) {
      setLevelUpInfo({ level: currentLevel, title: currentTitle })
      playRewardSound('levelup')
      // Layers the companion's own line on top of the existing level-up
      // burst overlay — "Okay, Newcomer's officially not the word for you
      // anymore. Explorer. Let's see what that actually means."
      narrative.play('level_transition', {
        previousTitle: previousTitleRef.current,
        newTitle: currentTitle,
      })
      // The ONLY badge popup in Level 1 -- fires once, at the actual
      // level 1 -> level 2 transition, not per-quest. A single fixed
      // badge (no selection step) per your call: every other completion
      // below now gets its own "completed" effect instead of a badge.
      //
      // Deliberately delayed to start AFTER the level-up overlay's own
      // 3200ms display window (see the effect below) instead of firing
      // in this same tick. BadgeModal renders at z-index 10000 vs the
      // overlay's 90, so queueing it immediately used to bury the LEVEL
      // UP burst under the badge the instant it appeared — the overlay
      // then auto-cleared itself on its own timer while the badge was
      // still open, so by the time the badge was dismissed the
      // transition had already silently expired, never actually seen.
      if (currentLevel === 2) {
        // Grades how the player played the level that JUST finished
        // (Level 1, not the level they're entering) -- captured into
        // locals before previousLevelRef/previousTitleRef get overwritten
        // at the bottom of this effect, so the setTimeout below reads the
        // completed level's own identity, not the new one.
        const completedLevel = previousLevelRef.current
        const completedLevelTitle = previousTitleRef.current
        const hintsUsedThisLevel = Math.max(
          0,
          (levelStartHintsRef.current ?? hintScrollsRef.current) - hintScrollsRef.current
        )
        const elapsedMs = Date.now() - (levelStartTimeRef.current ?? Date.now())
        const FAST_TARGET_MS = 15 * 60 * 1000 // 15 minutes counts as "fast"
        const minutesOverTarget = Math.max(0, (elapsedMs - FAST_TARGET_MS) / 60000)
        // Fast + accurate (no hints, within the target time) scores 100.
        // Completing at all is worth at least 80 -- hints/slowness only
        // ever pull the score DOWN from 100 toward that floor, never
        // below it, so simply finishing is always rewarded.
        const rawScore = 100 - hintsUsedThisLevel * 4 - minutesOverTarget
        const trustPercent = Math.max(80, Math.min(100, Math.round(rawScore)))
        const coinsAtBadgeTime = totalCoins

        // Reset the tracker for the level the player is now entering.
        levelStartTimeRef.current = Date.now()
        levelStartHintsRef.current = hintScrollsRef.current

        setTimeout(() => {
          queueBadge({
            id: `title_level_${currentLevel}`,
            title: 'Budget Boss',
            subtitle: 'Always knows where the money goes.',
            icon: '📊',
            meta: {
              level: completedLevel,
              levelTitle: completedLevelTitle,
              trustPercent,
              coins: coinsAtBadgeTime,
            },
          })
        }, 3400)
      }
      // Narrator explains what this level MEANS for the story — separate
      // voice, separate beat, only ever shown once per player.
      storyNarrator.playOnce(`level_${currentLevel}_start`)
      // Companion's genuine check-in — waits so it never overlaps the
      // level-transition line above; only once per level.
      setTimeout(() => fireProductFunnelCheckin(currentLevel), 9000)
    }
    previousLevelRef.current = currentLevel
    previousTitleRef.current = currentTitle
    // eslint-disable-next-line react-hooks/exhaustive-deps -- totalCoins
    // deliberately omitted: it's declared further down in this component,
    // so listing it here would reference it before initialization on the
    // very first render. Reading it inside the callback body (rather than
    // in this array) is safe -- effects only run after the full render
    // (including totalCoins's own declaration) has completed.
  }, [questState.levelInfo.level, questState.levelInfo.title, playRewardSound, fireProductFunnelCheckin, queueBadge])

  useEffect(() => {
    if (!levelUpInfo) return
    const timer = setTimeout(() => setLevelUpInfo(null), 3200)
    return () => clearTimeout(timer)
  }, [levelUpInfo])

  const didSyncRef = useRef(false)
  useEffect(() => {
    if (didSyncRef.current || !profile?.email) return
    didSyncRef.current = true

    syncPlayer({
      email: profile.email,
      name: profile.name,
      scenario: profile.scenario,
      state: profile.state,
      district: profile.district,
      avatarName: selectedAvatar?.name,
    }).then((serverState) => {
      // The old forced step-by-step walkthrough no longer auto-fires (see
      // GuidePanel.jsx for the on-demand replacement) — proceeds straight
      // to the story narrator instead of waiting on a tutorial that never
      // starts anymore.
      const fireResumeNudge = () => {
        const g = latestGuidanceRef.current
        if (!g) return
        let targetId = null
        if (g.companionPhase !== 'done' && g.companionSpawn) {
          targetId = 'companion'
        } else if (g.activeQuestIdInChain) {
          targetId = g.activeQuestIdInChain
        }
        if (!targetId) return

        if (g.companionPhase !== 'done') {
          storyNarrator.playRepeatable('companion_not_approaching')
        } else {
          companionNudge.show('quest_not_approaching', {
            questLabel: g.questState.questLabels[g.activeQuestIdInChain] ?? g.activeQuestIdInChain,
          })
        }
      }

      const beginOnboarding = () => {
        const tourStarted = introTour.start()
        if (!tourStarted) {
          storyNarrator.playOnce('intro')
          storyNarrator.playOnce('level_1_start')
        }
      }

      // Read-only check against the SAME key useIntroTour checks
      // internally — deliberately NOT calling introTour.start() here,
      // since that has a real side effect (immediately activates the
      // tour) for a first-timer, which would break the 5200ms
      // scene-settling pacing their tour is supposed to get. This check
      // has no side effects either way, so it's safe to run immediately.
      let isReturningPlayer = false
      try {
        isReturningPlayer = localStorage.getItem(`sbi_questcraft_introtour_done_${sanitizedUser}`) === 'true'
      } catch {
        isReturningPlayer = false
      }

      if (!serverState) {
        isGameReadyRef.current = true
        levelStartTimeRef.current = Date.now()
        levelStartHintsRef.current = hintScrollsRef.current
        setTimeout(beginOnboarding, 5200)
        return
      }
      questState.hydrateFromServer(serverState)
      setStreakInfo({ count: serverState.streak_count, freezers: serverState.streak_freezers })
      setHintScrolls(serverState.hint_scrolls)
      setCollectedTreasureIds(new Set(serverState.collected_treasure_ids || []))

      // Wait 500ms for state to settle, then allow sounds
      setTimeout(() => {
        isGameReadyRef.current = true
        // Level timing/hint-usage baseline starts now, once real server
        // state (including the actual hint count) has settled in --
        // starting this any earlier would baseline against the default
        // hint value instead of the player's real saved count.
        levelStartTimeRef.current = Date.now()
        levelStartHintsRef.current = serverState.hint_scrolls
      }, 500)

      if (isReturningPlayer) {
        // Skips the 5200ms new-player pacing entirely — that delay exists
        // so a first-timer's tour/story doesn't pop up before the world
        // has visually settled, which doesn't apply here (introTour.start()
        // is a no-op for them; beginOnboarding's playOnce() calls are also
        // no-ops, both confirmed by isReturningPlayer above). 800ms is
        // just enough for the scene to have something rendered.
        setTimeout(() => {
          beginOnboarding() // no-op path, kept for consistency/future-proofing
          fireResumeNudge()
        }, 800)
      } else {
        setTimeout(beginOnboarding, 5200)
      }
    })
  }, [profile?.email])

  // Only reached if the intro tour DID start above (a first-time player)
  // -- fires the story narrator the moment it finishes or gets skipped, so
  // the two overlays never show at once.
  const hasTriedStoryIntroRef = useRef(false)
  const narratorWasEverActiveRef = useRef(false)
  useEffect(() => {
    if (!isGameReadyRef.current || introTour.isActive || hasTriedStoryIntroRef.current) return
    hasTriedStoryIntroRef.current = true
    storyNarrator.playOnce('intro')
    storyNarrator.playOnce('level_1_start')
  }, [introTour.isActive])

  // Companion's proactive first greeting (checklist item #5) -- waits
  // for the narrator's WHOLE queued onboarding sequence (intro +
  // level_1_start) to actually finish, not just start, since both
  // systems now render through the same bottom box and would otherwise
  // try to show content out of order in the same tick. Fires once, ever,
  // per player -- tracked with its own storage key rather than reusing
  // the intro-tour or narrator "seen" flags, since this is genuinely a
  // separate thing being shown for the first time.
  useEffect(() => {
    if (storyNarrator.isActive) {
      narratorWasEverActiveRef.current = true
      return
    }
    if (!narratorWasEverActiveRef.current || !hasTriedStoryIntroRef.current) return

    let alreadyGreeted = false
    try {
      alreadyGreeted = localStorage.getItem(`sbi_questcraft_greeted_${sanitizedUser}`) === 'true'
    } catch {
      alreadyGreeted = false
    }
    if (alreadyGreeted) return

    try {
      localStorage.setItem(`sbi_questcraft_greeted_${sanitizedUser}`, 'true')
    } catch {
      // ignore storage errors
    }
    narrative.play('companion_first_greeting', { playerName: profile.name })
    justFiredGreetingRef.current = true
  }, [storyNarrator.isActive, sanitizedUser, narrative, profile.name])

  // Once the greeting we just fired above actually finishes (not when
  // ANY narrative beat finishes -- justFiredGreetingRef scopes this to
  // specifically that one), point the notice board arrow at it so a
  // first-time player's attention lands somewhere concrete right after
  // being welcomed, instead of trailing off with nothing to do next.
  const justFiredGreetingRef = useRef(false)
  useEffect(() => {
    if (narrative.isActive) return
    if (!justFiredGreetingRef.current) return
    justFiredGreetingRef.current = false
    triggerNoticeBoardArrow()
  }, [narrative.isActive, triggerNoticeBoardArrow])

  const totalCoins = useMemo(() => {
    return (profile.coins ?? 120) + (questState.coins || 0) + bonusCoins
  }, [profile.coins, questState.coins, bonusCoins])

  // Bumps the Coins HUD pill for a moment whenever the total goes up, so a
  // reward reads as a visible event instead of just a number changing.
  // Skips the initial mount (no previous value yet) and any decrease.
  const previousTotalCoinsRef = useRef(null)
  const [coinPop, setCoinPop] = useState(false)
  useEffect(() => {
    const prev = previousTotalCoinsRef.current
    previousTotalCoinsRef.current = totalCoins
    if (prev === null || totalCoins <= prev) return
    setCoinPop(true)
    const timer = setTimeout(() => setCoinPop(false), 650)
    return () => clearTimeout(timer)
  }, [totalCoins])

  useEffect(() => {
    if (!profile || !profile.name || profile.name === 'Player') {
      if (!state?.profile && !savedProfile?.name) {
        console.warn("No player profile found, redirecting to setup...")
        navigate('/')
      }
    }
  }, [profile, state, savedProfile, navigate])

  useEffect(() => {
    let isMounted = true

    async function fetchDynamicWorld() {
      const userEmail = profile?.email || 'sharma@sbi.com'

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/world?email=${encodeURIComponent(userEmail)}`)
        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`)
        }
        const layoutData = await response.json()
        
        if (isMounted) {
          if (!layoutData.scenario && profile.scenario) {
            layoutData.scenario = profile.scenario
          }
          setLayout(layoutData)
        }
      } catch (err) {
        console.warn("Backend API unavailable. Falling back to local /layout.json:", err.message)
        fetch('/layout.json')
          .then((res) => res.json())
          .then((fallbackLayout) => {
            if (isMounted) {
              if (profile.scenario) {
                fallbackLayout.scenario = profile.scenario
              }
              setLayout(fallbackLayout)
            }
          })
          .catch((fallbackErr) => console.error("Failed fallback layout.json:", fallbackErr))
      }
    }

    fetchDynamicWorld()

    return () => {
      isMounted = false
    }
  }, [profile?.email, profile?.scenario])

  const activeCoinsList = useMemo(() => {
    if (layout?.collectibles && Array.isArray(layout.collectibles)) {
      return layout.collectibles.slice(0, 30).map((c, idx) => ({
        id: c.id || `collectible-${idx}`,
        position: [c.x ?? c.render_x ?? 0, ROAD_SURFACE_HEIGHT + 0.6, c.z ?? c.render_z ?? 0],
        reward: c.reward || 10,
      }))
    }

    if (layout?.roads && Array.isArray(layout.roads) && layout.roads.length > 0) {
      const totalRoads = layout.roads.length
      const targetCount = Math.min(30, totalRoads)
      const step = totalRoads / targetCount

      return Array.from({ length: targetCount }, (_, i) => {
        const indexJitter = Math.floor(Math.sin(i * 3.7) * 1.5)
        const roadIndex = Math.max(0, Math.min(totalRoads - 1, Math.floor(i * step + indexJitter)))
        const road = layout.roads[roadIndex]

        const offsetX = Math.sin(i * 2.1) * 0.85
        const offsetZ = Math.cos(i * 1.9) * 0.85

        return {
          id: `road-coin-${i}`,
          position: [
            (road.render_x ?? 0) + offsetX,
            ROAD_SURFACE_HEIGHT + 0.6,
            (road.render_z ?? 0) + offsetZ,
          ],
          reward: 10,
        }
      })
    }

    return Array.from({ length: 30 }, (_, i) => ({
      id: `coin-fallback-${i}`,
      position: [
        (i % 6) * 7 - 18 + Math.sin(i * 2) * 1.5,
        ROAD_SURFACE_HEIGHT + 0.6,
        Math.floor(i / 6) * 7 - 18 + Math.cos(i * 1.8) * 1.5,
      ],
      reward: 10,
    }))
  }, [layout])

  // Sparse bonus treasure chests, scattered near roads but far less densely
  // than coin collectibles, at fixed points so they're the same each session
  // for this generated world. Not part of the main quest chain — answering
  // their quiz grants a small coin bonus plus a random power-up rather than
  // unlocking anything.
  const treasureSpots = useMemo(() => {
    const topics = Object.values(QUEST_META).map((m) => m.topic)

    if (layout?.roads && Array.isArray(layout.roads) && layout.roads.length > 0) {
      const totalRoads = layout.roads.length
      const targetCount = Math.min(6, Math.max(3, Math.floor(totalRoads / 25)))
      const step = totalRoads / targetCount

      return Array.from({ length: targetCount }, (_, i) => {
        const roadIndex = Math.max(0, Math.min(totalRoads - 1, Math.floor(i * step + step / 2)))
        const road = layout.roads[roadIndex]

        const offsetX = Math.sin(i * 4.3) * 2.5
        const offsetZ = Math.cos(i * 3.6) * 2.5

        return {
          id: `treasure-${i}`,
          position: [
            (road.render_x ?? 0) + offsetX,
            ROAD_SURFACE_HEIGHT,
            (road.render_z ?? 0) + offsetZ,
          ],
          topic: topics[i % topics.length],
        }
      })
    }

    return []
  }, [layout])

  // Background NPCs — every avatar the player DIDN'T pick for themselves
  // (UserDetailsPage's AVATARS list minus the selected one), each spawned
  // at a distinct road point and left to wander locally. Purely decorative
  // for now — no name-recognition/dialogue tie-in yet, that's a separate
  // future system layered on top of this.
  const backgroundNpcAvatars = useMemo(
    () => AVATARS.filter((a) => a.id !== selectedAvatar?.id),
    [selectedAvatar]
  )

  const NPC_INTERACT_RADIUS = 3.5
  const nearbyNpc = useMemo(() => {
    if (!playerPos) return null
    let closest = null
    let closestDist = NPC_INTERACT_RADIUS
    for (const [id, pos] of npcPositionsRef.current.entries()) {
      const dist = Math.hypot(playerPos.x - pos.x, playerPos.z - pos.z)
      if (dist < closestDist) {
        closestDist = dist
        closest = id
      }
    }
    if (!closest) return null
    const avatar = backgroundNpcAvatars.find((a) => a.id === closest)
    return avatar ? { id: closest, name: avatar.name } : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPos, backgroundNpcAvatars])

  // Recognition (Stage 4) only fires once Trust has actually built up —
  // below the threshold, interacting instead becomes an advisory
  // encounter (see handleNpcAdvisory further down, once its dependencies
  // — buildUserProfileForAgent etc. — are actually declared).
  const NPC_RECOGNITION_TRUST_THRESHOLD = 15
  const hasShownRecognitionRef = useRef(false)

  const npcSpawnPoints = useMemo(() => {
    if (!layout?.roads || layout.roads.length === 0) return []
    const totalRoads = layout.roads.length
    return backgroundNpcAvatars.map((_, i) => {
      // Spread NPCs across distinct roads rather than clustering — same
      // "step through the road list" approach treasureSpots/activeCoinsList
      // already use above.
      const roadIndex = Math.floor(((i + 1) / (backgroundNpcAvatars.length + 1)) * totalRoads) % totalRoads
      const road = layout.roads[roadIndex]
      return [road.render_x ?? 0, road.render_z ?? 0]
    })
  }, [layout, backgroundNpcAvatars])

  // Phase 3A — 3 fixed story NPCs (Arjun, Riya, and a not-yet-named face),
  // each standing at a genuinely spread-out spot rather than clustered
  // near the city center like the companion/mini-game hub are. Uses
  // fixed fractional points through the road list (20%/50%/80%) instead
  // of the wandering-NPC spread formula, since there are always exactly
  // 3 of these regardless of how many background avatars exist.
  const FIXED_STORY_NPCS = useMemo(() => ([
    { id: 'arjun', name: 'Arjun', portrait: npcPortrait1, greetingBeat: 'npc_greeting_arjun', bodyUrl: AVATARS[0]?.url, fraction: 0.2 },
    { id: 'riya', name: 'Riya', portrait: npcPortrait2, greetingBeat: 'npc_greeting_riya', bodyUrl: AVATARS[1]?.url, fraction: 0.5 },
    { id: 'meera', name: 'Meera', portrait: npcPortrait3, greetingBeat: 'npc_greeting_meera', bodyUrl: AVATARS[2]?.url, fraction: 0.8 },
  ]), [])

  // Minimum distance an NPC's spawn point must keep from any building's
  // center. Bumped up from the first attempt at this fix (7 -> 12) --
  // that version still let at least one NPC end up inside/behind a
  // wall, so the margin was evidently too tight; being honest that I
  // can't run the actual city generator from here to verify an exact
  // number, so this needs a real in-game check after applying.
  const BUILDING_CLEARANCE = 12

  // How far (in road-list index terms) to search around each NPC's
  // target fraction for the best available spot. Kept wide enough to
  // find genuine open ground, narrow enough that the 3 NPCs still land
  // in meaningfully different parts of the city rather than potentially
  // converging on the exact same clear patch.
  const SEARCH_WINDOW = 40

  const fixedStoryNpcPositions = useMemo(() => {
    if (!layout?.roads || layout.roads.length === 0) return {}
    const totalRoads = layout.roads.length
    const buildings = layout.buildings || []

    const clearanceAt = (x, z) => {
      if (buildings.length === 0) return Infinity
      return Math.min(...buildings.map((b) => Math.hypot((b.render_x ?? 0) - x, (b.render_z ?? 0) - z)))
    }

    const positions = {}
    FIXED_STORY_NPCS.forEach((npc) => {
      const startIndex = Math.floor(npc.fraction * totalRoads) % totalRoads

      // Score every candidate in the search window and take the one
      // with the BEST clearance found, rather than the first one that
      // merely clears a fixed threshold. This matters because if
      // consecutive array indices happen to sit in the same spatial
      // cluster (roads are generated as h_tiles + v_tiles, not
      // necessarily interleaved by location), a first-match search can
      // stay stuck checking tiles that are all similarly close to the
      // same building, never finding the genuinely open spot that
      // might be one step further out.
      let best = null
      let bestClearance = -Infinity
      const halfWindow = Math.floor(SEARCH_WINDOW / 2)
      for (let offset = -halfWindow; offset <= halfWindow; offset++) {
        const candidateIndex = ((startIndex + offset) % totalRoads + totalRoads) % totalRoads
        const candidate = layout.roads[candidateIndex]
        const x = candidate.render_x ?? 0
        const z = candidate.render_z ?? 0
        const clearance = clearanceAt(x, z)
        if (clearance > bestClearance) {
          bestClearance = clearance
          best = { x, z }
        }
      }

      let chosen = best

      // Fallback: every road tile failed the clearance check (a very
      // dense layout) -- better to place the NPC somewhere than nowhere,
      // even if it's imperfect; the original pick is still the most
      // reasonable single fallback available.
      if (!chosen) {
        const road = layout.roads[startIndex]
        chosen = { x: road.render_x ?? 0, z: road.render_z ?? 0 }
      }

      positions[npc.id] = [chosen.x, ROAD_SURFACE_HEIGHT, chosen.z]
    })
    return positions
  }, [layout, FIXED_STORY_NPCS])

  const NEARBY_FIXED_NPC_RADIUS = 3.5
  const nearbyFixedNpc = useMemo(() => {
    if (!playerPos) return null
    for (const npc of FIXED_STORY_NPCS) {
      const pos = fixedStoryNpcPositions[npc.id]
      if (!pos) continue
      const dist = Math.hypot(playerPos.x - pos[0], playerPos.z - pos[2])
      if (dist < NEARBY_FIXED_NPC_RADIUS) return npc
    }
    return null
  }, [playerPos, fixedStoryNpcPositions, FIXED_STORY_NPCS])

  // Tracks whether the player is currently close enough to an uncollected
  // treasure to interact — mirrors `nearbyQuest`, but for treasure chests,
  // so the mobile Interact button (and, if desired, a toast) can cover both,
  // not just main quests.
  const nearbyTreasure = useMemo(() => {
    if (!playerPos) return null
    for (const t of treasureSpots) {
      if (collectedTreasureIds.has(t.id)) continue
      const dist = Math.hypot(playerPos.x - t.position[0], playerPos.z - t.position[2])
      if (dist < 3.5) return t
    }
    return null
  }, [playerPos, treasureSpots, collectedTreasureIds])

  const mapBounds = useMemo(() => {
    if (!layout || !layout.buildings) return { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    
    const allItems = [...(layout.buildings || []), ...(layout.roads || []), ...(layout.parking || [])]
    allItems.forEach(item => {
      if (item.render_x !== undefined) {
        minX = Math.min(minX, item.render_x)
        maxX = Math.max(maxX, item.render_x)
      }
      if (item.render_z !== undefined) {
        minZ = Math.min(minZ, item.render_z)
        maxZ = Math.max(maxZ, item.render_z)
      }
    })

    return {
      minX: minX === Infinity ? -50 : minX - 10,
      maxX: maxX === -Infinity ? 50 : maxX + 10,
      minZ: minZ === Infinity ? -50 : minZ - 10,
      maxZ: maxZ === -Infinity ? 50 : maxZ + 10,
    }
  }, [layout])

  // Fixed spot on a road, near the city center, where the chosen companion
  // appears once picked — mirrors PlayerController's own "nearest road to
  // center" spawn logic, offset a few units so it's a visibly different
  // tile than the player's own spawn point rather than overlapping it.
  const companionSpawn = useMemo(() => {
    if (!layout?.roads || layout.roads.length === 0) return null
    const centerX = (mapBounds.minX + mapBounds.maxX) / 2
    const centerZ = (mapBounds.minZ + mapBounds.maxZ) / 2

    const closestRoad = layout.roads.reduce((closest, road) => {
      const d1 = Math.hypot((road.render_x ?? 0) - centerX, (road.render_z ?? 0) - centerZ)
      const d2 = Math.hypot((closest.render_x ?? 0) - centerX, (closest.render_z ?? 0) - centerZ)
      return d1 < d2 ? road : closest
    })

    return [
      (closestRoad.render_x ?? 0) + 2,
      ROAD_SURFACE_HEIGHT,
      (closestRoad.render_z ?? 0) + 2,
    ]
  }, [layout, mapBounds])

  // A single fixed, discoverable spot for the mini-game hub — same
  // "nearest road to city center" approach as the companion, offset the
  // other direction so the two markers don't overlap. Shows on the map
  // like a treasure chest/quest marker, per the request that mini-games
  // be a real discoverable location, not a random popup.
  // 3 distinct mini-game spawn points spread across the city (checklist
  // item #4) -- replaces the old single shared hub, which sat right at
  // the map center near spawn and bundled all 3 games behind one picker
  // menu. Each spot now hosts exactly one specific game directly.
  const MINIGAME_TYPES = useMemo(() => ([
    { id: 'memory_match', label: 'Memory Match', icon: '\ud83e\udde0', fraction: 0.15 },
    { id: 'pattern_sequence', label: 'Pattern Sequence', icon: '\ud83c\udfa8', fraction: 0.45 },
    { id: 'quick_sort', label: 'Quick Sort', icon: '\u26a1', fraction: 0.75 },
    { id: 'cash_flow_catch', label: 'Cash Flow Catch', icon: '\ud83d\udcb0', fraction: 0.60 },
  ]), [])

  const miniGameSpawns = useMemo(() => {
    if (!layout?.roads || layout.roads.length === 0) return {}
    const totalRoads = layout.roads.length
    const buildings = layout.buildings || []
    const npcPositions = Object.values(fixedStoryNpcPositions || {})

    const clearanceAt = (x, z) => {
      if (buildings.length === 0) return Infinity
      return Math.min(...buildings.map((b) => Math.hypot((b.render_x ?? 0) - x, (b.render_z ?? 0) - z)))
    }

    // Minimum distance from any fixed NPC -- without this, a mini-game
    // spot and an NPC could end up within each other's 7-unit reveal
    // radius, causing both floating "[E] ..." labels to render on top
    // of each other (the reported overlap bug). Both systems searched
    // for clearance independently, with no awareness of each other.
    const NPC_MIN_DISTANCE = 15
    const tooCloseToNpc = (x, z) =>
      npcPositions.some((pos) => Math.hypot(pos[0] - x, pos[2] - z) < NPC_MIN_DISTANCE)

    // Minimum distance from any mini-game spot already placed this pass --
    // without this, two spots can independently pick the same or an
    // adjacent road tile (each only checked clearance from buildings/NPCs,
    // never from each other), which is what caused two spot markers/
    // interact prompts to overlap even after the "closest wins" fix.
    // Bigger than the 3.5 interact radius + 7 reveal radius combined so
    // spots can't even both be visible/interactable at once.
    const MINIGAME_MIN_DISTANCE = 18
    const placedSpawns = []
    const tooCloseToOtherMinigame = (x, z) =>
      placedSpawns.some((pos) => Math.hypot(pos[0] - x, pos[1] - z) < MINIGAME_MIN_DISTANCE)

    const spawns = {}
    MINIGAME_TYPES.forEach((game) => {
      const startIndex = Math.floor(game.fraction * totalRoads) % totalRoads
      let best = null
      let bestClearance = -Infinity
      // Fallback candidate ignoring NPC/other-minigame distance, used only
      // if the whole search window fails those checks -- better to spawn
      // slightly close than not spawn at all.
      let fallbackBest = null
      let fallbackClearance = -Infinity
      const halfWindow = 20
      for (let offset = -halfWindow; offset <= halfWindow; offset++) {
        const candidateIndex = ((startIndex + offset) % totalRoads + totalRoads) % totalRoads
        const candidate = layout.roads[candidateIndex]
        const x = candidate.render_x ?? 0
        const z = candidate.render_z ?? 0
        const clearance = clearanceAt(x, z)
        if (clearance > fallbackClearance) {
          fallbackClearance = clearance
          fallbackBest = { x, z }
        }
        if (tooCloseToNpc(x, z) || tooCloseToOtherMinigame(x, z)) continue
        if (clearance > bestClearance) {
          bestClearance = clearance
          best = { x, z }
        }
      }
      const chosen = best || fallbackBest
      if (chosen) placedSpawns.push([chosen.x, chosen.z])
      spawns[game.id] = chosen ? [chosen.x, ROAD_SURFACE_HEIGHT, chosen.z] : null
    })
    return spawns
  }, [layout, MINIGAME_TYPES, fixedStoryNpcPositions])

  // Whichever of the 3 spots (if any) the player is currently standing
  // near -- replaces the old single nearbyMiniGameHub boolean (renamed
  // nearbyMiniGameSpot below) since
  // there's now 3 independent spots to check instead of 1.
  const nearbyMiniGameSpot = useMemo(() => {
    if (!playerPos) return null
    // Pick the CLOSEST spot within range, not just the first one in
    // MINIGAME_TYPES order -- when two spawn points are both within the
    // radius, array order used to win regardless of which marker the
    // player was actually standing next to (the bug behind the label
    // mismatch: "[E] Play Cash Flow Catch" on the marker vs "Press E —
    // Play Pattern Sequence" on the bottom prompt).
    let closestId = null
    let closestDist = Infinity
    for (const game of MINIGAME_TYPES) {
      const pos = miniGameSpawns[game.id]
      if (!pos) continue
      const dist = Math.hypot(playerPos.x - pos[0], playerPos.z - pos[2])
      if (dist < 3.5 && dist < closestDist) {
        closestDist = dist
        closestId = game.id
      }
    }
    return closestId
  }, [playerPos, miniGameSpawns, MINIGAME_TYPES])

  // Single choke point for actually opening a mini-game -- both the KeyE
  // handler and the mobile interact button call this instead of setting
  // miniGameHubOpen directly, so the level-1 sequence gate only needs to
  // live in one place. Pattern Sequence and Quick Sort are NOT part of
  // the required level-1 chain, so they stay freely playable any time;
  // only Memory Match and Cash Flow Catch specifically wait their turn.
  const handleMiniGameSpotInteract = useCallback(() => {
    if (!nearbyMiniGameSpot) return
    if (level1NextRequiredStep && level1NextRequiredStep !== nearbyMiniGameSpot
      && LEVEL_1_SEQUENCE.includes(nearbyMiniGameSpot)) {
      narrative.play({
        speaker: 'companion',
        animation: null,
        lines: [`Let's finish what's in front of us first -- ${LEVEL_1_SEQUENCE_LABELS[level1NextRequiredStep] || 'that'} first.`],
      })
      return
    }
    setMiniGameHubOpen(true)
  }, [nearbyMiniGameSpot, level1NextRequiredStep, LEVEL_1_SEQUENCE, LEVEL_1_SEQUENCE_LABELS, narrative])

  // Proximity check for the companion while it's still lying on the road,
  // unrepaired — same pattern as nearbyTreasure/nearbyQuest.
  const nearbyCompanionToRepair = useMemo(() => {
    if (companionPhase !== 'placed' || !playerPos || !companionSpawn) return false
    const dist = Math.hypot(playerPos.x - companionSpawn[0], playerPos.z - companionSpawn[2])
    return dist < 3.5
  }, [companionPhase, playerPos, companionSpawn])

  // Fires once, the first time the player actually reaches the companion
  // — a proximity-triggered reaction, distinct from the game-start intro.
  useEffect(() => {
    if (nearbyCompanionToRepair) {
      storyNarrator.playOnce('companion_found_reaction')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyCompanionToRepair])

  // Zoomed, player-centered minimap coordinates — mapping the WHOLE city
  // into the 200x200 viewBox (the old approach) shrinks everything on a
  // large map into a nearly invisible cluster of dots. These instead show
  // a fixed-radius window around the player, like a real minimap, so the
  // path and nearby buildings are actually legible.
  const MINIMAP_VIEW_RADIUS = 45 // world units visible in each direction from the player
  const minimapCenter = playerPos
    ? { x: playerPos.x, z: playerPos.z }
    : { x: (mapBounds.minX + mapBounds.maxX) / 2, z: (mapBounds.minZ + mapBounds.maxZ) / 2 }
  const toMinimapX = (x) =>
    ((x - (minimapCenter.x - MINIMAP_VIEW_RADIUS)) / (MINIMAP_VIEW_RADIUS * 2)) * 180 + 10
  const toMinimapZ = (z) =>
    ((z - (minimapCenter.z - MINIMAP_VIEW_RADIUS)) / (MINIMAP_VIEW_RADIUS * 2)) * 180 + 10

  // Builds an obviously-generic placeholder quiz, used only when the backend
  // call fails or returns something unparseable. Deliberately NOT a curated
  // per-quest question bank, so if this ever shows up in the game it's clearly
  // recognizable as "the backend didn't respond" rather than looking like a
  // real (but repeated) quiz question.
  const buildGenericFallbackQuiz = useCallback((questId) => ({
    question: `(Offline) Complete the ${questState.questLabels[questId] || questId} verification challenge!`,
    options: ["Submit official credentials", "Visit branch office", "Verify identity online", "Request advisor call"],
    correctIndex: 0,
    reward: 20,
    isFallback: true,
  }), [questState.questLabels])

  // Normalizes whatever shape the Groq agent returns into the flat shape
  // QuestQuizModal expects. The backend now returns a fixed schema (see
  // SYSTEM_PROMPT in main.py), but this still tolerates a couple of likely
  // variants defensively — e.g. options coming back as [{option_text}, ...]
  // objects instead of plain strings, or a 1-based correct option id.
  const normalizeQuizPayload = useCallback((data, fallbackReward) => {
    if (!data) return null
    const payload = data.MAIN_QUEST || data.main_quest || data.quiz || data

    const question = payload.question || payload.question_text || payload.quiz_question
    let rawOptions = payload.options || payload.choices

    if (!question || !Array.isArray(rawOptions) || rawOptions.length < 2) {
      return null
    }

    // Flatten option objects like {option_id, option_text} into plain strings
    const options = rawOptions.map((opt) =>
      typeof opt === 'string' ? opt : (opt?.option_text ?? opt?.text ?? opt?.label ?? String(opt))
    )

    let rawCorrect = payload.correctIndex ?? payload.correct_index ?? payload.answer_index ?? payload.correct_option

    // Some responses may instead mark the correct option inline, e.g.
    // options: [{option_id: 1, option_text: "...", is_correct: true}, ...]
    if (rawCorrect === undefined || rawCorrect === null) {
      const correctObjIdx = rawOptions.findIndex((opt) => opt?.is_correct || opt?.correct)
      if (correctObjIdx !== -1) rawCorrect = correctObjIdx
    }

    if (rawCorrect === undefined || rawCorrect === null) return null

    let correctIndex = Number(rawCorrect)
    // If the model used 1-based option_id as the "correct" pointer, option_id
    // won't line up with a 0-based array index — detect and correct for that.
    if (rawOptions[0]?.option_id !== undefined && !Number.isNaN(correctIndex)) {
      const byOptionId = rawOptions.findIndex((opt) => opt?.option_id === correctIndex)
      if (byOptionId !== -1) correctIndex = byOptionId
    }

    if (Number.isNaN(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return null
    }

    return {
      question,
      options,
      correctIndex,
      reward: payload.reward || fallbackReward,
      hint: payload.hint || payload.hint_text,
      concept_tag: payload.concept_tag,
    }
  }, [])

  const buildUserProfileForAgent = useCallback(() => ({
    email: profile?.email || 'kavya@example.com',
    name: profile?.name || 'Kavya',
    scenario: profile?.scenario || questState.scenario || 'student',
    state: profile?.state,
    district: profile?.district,
  }), [profile, questState.scenario])

  const handleOpenCheckpoint = useCallback(async (questId) => {
    if (questState.isLocked(questId)) {
      console.log('This quest is locked! Complete previous tasks first.')
      return
    }
    if (questState.isComplete(questId)) {
      console.log('Quest already completed!')
      return
    }

    const fallbackQuiz = buildGenericFallbackQuiz(questId)

    setActiveTreasureId(null)
    setActiveQuestId(questId)
    setQuizLoading(true)

    const agentResponse = await generateQuizFromBackend({
      requestType: 'MAIN_QUEST',
      userProfile: buildUserProfileForAgent(),
      questContext: { quest_id: questId, topic: QUEST_META[questId]?.topic, current_question_text: '' },
      performanceState: { current_difficulty: questState.levelInfo.difficulty, last_question_attempts: 1 },
    })

    const normalized = normalizeQuizPayload(agentResponse, fallbackQuiz.reward)
    setActiveQuiz(normalized || fallbackQuiz)
    setQuizLoading(false)
  }, [questState, buildUserProfileForAgent, normalizeQuizPayload, buildGenericFallbackQuiz])

  const handleOpenTreasure = useCallback(async (treasure) => {
    if (collectedTreasureIds.has(treasure.id) || activeQuiz || quizLoading) return

    const fallbackQuiz = {
      question: `(Offline) Quick quiz: ${treasure.topic}`,
      options: ["True", "False", "Not sure", "Ask a banker"],
      correctIndex: 0,
      reward: 5,
      isFallback: true,
    }

    setActiveQuestId(null)
    setActiveTreasureId(treasure.id)
    setQuizLoading(true)

    const agentResponse = await generateQuizFromBackend({
      requestType: 'ROAD_TREASURE',
      userProfile: buildUserProfileForAgent(),
      questContext: { quest_id: treasure.id, topic: treasure.topic, current_question_text: '' },
      performanceState: { current_difficulty: questState.levelInfo.difficulty, last_question_attempts: 1 },
    })

    const normalized = normalizeQuizPayload(agentResponse, fallbackQuiz.reward)
    setActiveQuiz(normalized || fallbackQuiz)
    setQuizLoading(false)
  }, [collectedTreasureIds, activeQuiz, quizLoading, buildUserProfileForAgent, normalizeQuizPayload, questState.levelInfo])

  // NPC advisory encounters — a citizen presents a real financial
  // decision (comparing options, not a single-fact question). Reuses the
  // exact same quiz pipeline as quests/treasures (generateQuizFromBackend
  // + normalizeQuizPayload + QuestQuizModal) rather than a parallel
  // system, so it behaves identically from the player's side.
  // Resolves a successful advisory conversation — identical reward logic
  // to before (coins come from questState.completeQuest via the existing
  // quest-chain economy, not from the AI-generated reward number), just
  // triggered from the conversation instead of a modal's onSuccess.
  const completeAdvisorySuccess = useCallback((npc) => {
    addBond(BOND_REWARDS.quest) // same weight as a quest — this genuinely is one
    playSuccessSound()

    // Silently completes the right chain slot for THIS level's npc-help
    // quota (L1 needs 1, L2-L5 need 3) — coins come from that completion
    // (QUEST_REWARDS), not a separate bonus, so nothing gets double-counted.
    setLevelTaskProgress((prev) => {
      // Level 1's 5 chain slots are the fixed companion/arjun/
      // memory_match/cash_flow_catch/riya sequence now -- a wandering,
      // unscripted NPC encounter isn't part of that and no longer
      // consumes one of those slots. The bond/sound reward above still
      // applies; it just doesn't move the Level 1 progress bar or grant
      // chain coins.
      if (currentLevel === 1) return prev
      if (prev.npcHelpCount >= NPC_HELP_QUOTA) return prev // quota already met
      const slotIndex = prev.npcHelpCount
      const chainId = getTaskChainId(slotIndex)
      if (chainId) questState.completeQuest(chainId)
      return { ...prev, npcHelpCount: prev.npcHelpCount + 1 }
    })

    setSystemNotice(`🤝 Helped ${npc.name}!`)
    narrative.play('npc_thanks', { npcName: npc.name, playerName: profile.name })
    setActiveNpcAdvisory(null)
  }, [addBond, playSuccessSound, currentLevel, getTaskChainId, questState, narrative, profile.name, NPC_HELP_QUOTA])

  // Shows the NPC's remaining answer choices as the next conversation
  // turn's option buttons. A wrong pick doesn't lock or fail anything —
  // it's dropped from the list and the conversation loops back with
  // whatever's left, so it reads as "let me think again" rather than a
  // graded quiz with a fixed number of tries.
  const presentAdvisoryOptions = useCallback((npc, quizData, availableIndices) => {
    narrative.play(
      {
        speaker: 'npc',
        animation: null,
        lines: ["Here's what I'm weighing — what would you actually do?"],
        options: availableIndices.map((idx) => ({ label: quizData.options[idx], value: String(idx) })),
      },
      {},
      (value) => {
        const chosenIdx = Number(value)
        if (chosenIdx === quizData.correctIndex) {
          completeAdvisorySuccess(npc)
          return
        }

        const remaining = availableIndices.filter((idx) => idx !== chosenIdx)
        if (remaining.length <= 1) {
          // Down to one (or zero) real alternative left — resolve gently
          // instead of hard-failing; the player can find this NPC again
          // later for another attempt.
          narrative.play('npc_out_of_options', {}, () => {
            setActiveNpcAdvisory(null)
          })
        } else {
          narrative.play('npc_wrong_suggestion', {}, () => {
            presentAdvisoryOptions(npc, quizData, remaining)
          })
        }
      }
    )
  }, [narrative, completeAdvisorySuccess])

  const handleNpcAdvisory = useCallback(async (npc) => {
    if (activeQuiz || quizLoading || narrative.isActive) return

    const { topic, fallbackQuiz } = pickAdvisoryTopicForLevel(currentLevel)

    setActiveQuestId(null)
    setActiveTreasureId(null)
    setActiveNpcAdvisory({ name: npc.name })
    setQuizLoading(true)

    const agentResponse = await generateQuizFromBackend({
      requestType: 'ROAD_TREASURE', // same schema as treasures; topic carries the real advisory scenario
      userProfile: buildUserProfileForAgent(),
      questContext: { quest_id: `npc_advisory_${npc.id}`, topic, current_question_text: '' },
      performanceState: { current_difficulty: questState.levelInfo.difficulty, last_question_attempts: 1 },
    })

    // The player may have navigated away, refreshed, or re-triggered this
    // same advisory while this request was in flight — applying a stale
    // response at this point would either update state nobody's looking
    // at, or (the originally reported bug) open a dialogue beat that no
    // longer matches what's actually happening on screen.
    if (!isMountedRef.current) return

    const normalized = normalizeQuizPayload(agentResponse, 8)
    const finalQuiz = normalized || { ...fallbackQuiz, reward: 8, isFallback: true }
    setQuizLoading(false)

    // The WHOLE exchange happens in the bottom dialogue bar — no popup
    // card. The NPC states their dilemma first (the fetched question is
    // already written in first person, e.g. "I've got three loan
    // offers..."), then a tap reveals their actual options as the next
    // turn's buttons via presentAdvisoryOptions above.
    narrative.play(
      { speaker: 'npc', animation: null, lines: [finalQuiz.question] },
      {},
      () => presentAdvisoryOptions(npc, finalQuiz, finalQuiz.options.map((_, i) => i))
    )
  }, [activeQuiz, quizLoading, buildUserProfileForAgent, normalizeQuizPayload, questState.levelInfo, currentLevel, narrative, presentAdvisoryOptions])

  // The capstone — reuses this level's LAST chain building as its
  // physical location (no new 3D assets needed), but poses the bigger,
  // higher-reward LEVEL_CAPSTONE_QUESTS question there instead of the old
  // generic per-building quiz.
  const handleCapstoneInteract = useCallback(async () => {
    if (activeQuiz || quizLoading) return
    if (capstoneChainId && questState.isLocked(capstoneChainId)) return // can't skip ahead to it
    // Level 1's capstone additionally requires the FULL named sequence
    // (not just the old generic quota) -- without this, the underlying
    // quest-completion count could already reach 5 (and level up) from
    // companion + Arjun alone + any one mini-game + recognition, since
    // NPC_HELP_QUOTA/minigameDone only ever needed ONE of each type.
    // The interaction-level redirects on Arjun/Riya/Memory Match/Cash
    // Flow Catch stop the player visiting them out of order, but don't
    // by themselves force Riya or Cash Flow Catch to happen at all --
    // this is the actual hard requirement.
    if (level1NextRequiredStep) {
      narrative.play({
        speaker: 'companion',
        animation: null,
        lines: [`Let's finish what's in front of us first -- ${LEVEL_1_SEQUENCE_LABELS[level1NextRequiredStep] || 'that'} first.`],
      })
      return
    }
    const capstone = LEVEL_CAPSTONE_QUESTS[currentLevel]
    if (!capstone) return

    setActiveQuestId(null)
    setActiveTreasureId(null)
    setActiveCapstone(true)
    setQuizLoading(true)

    const agentResponse = await generateQuizFromBackend({
      requestType: 'MAIN_QUEST',
      userProfile: buildUserProfileForAgent(),
      questContext: { quest_id: `capstone_level_${currentLevel}`, topic: capstone.label, current_question_text: '' },
      performanceState: { current_difficulty: questState.levelInfo.difficulty, last_question_attempts: 1 },
    })

    const normalized = normalizeQuizPayload(agentResponse, capstone.reward)
    setActiveQuiz(normalized || { ...capstone.fallbackQuiz, reward: capstone.reward, isFallback: true })
    setQuizLoading(false)
  }, [activeQuiz, quizLoading, buildUserProfileForAgent, normalizeQuizPayload, questState.levelInfo, currentLevel, level1NextRequiredStep, LEVEL_1_SEQUENCE_LABELS, narrative])

  const handleNpcInteract = useCallback(() => {
    if (!nearbyNpc || narrative.isActive || activeQuiz || quizLoading) return

    if (bondMeter >= NPC_RECOGNITION_TRUST_THRESHOLD && !hasShownRecognitionRef.current) {
      hasShownRecognitionRef.current = true
      narrative.play('npc_recognition_first_time', { playerName: profile.name })
      // Companion's reaction follows right after, once the NPC's line is
      // dismissed — a short delay so the two don't overlap. Keeps this
      // one-time moment special rather than immediately jumping into a quiz.
      setTimeout(() => narrative.play('companion_reacts_to_recognition'), 3500)

      // Only counts as Level 1's task slot 2 if it actually happens during
      // Level 1 — a delayed recognition moment (rare, but possible) still
      // plays as flavor, it just won't map to a task slot outside L1.
      if (currentLevel === 1) {
        // Slot 2 is now reserved for Memory Match in Level 1's fixed
        // sequence -- this recognition moment used to double as the
        // level's 3rd required slot, but it's flavor-only now and no
        // longer completes a chain slot itself.
        setLevelTaskProgress((prev) => {
          if (prev.recognitionDone) return prev
          return { ...prev, recognitionDone: true }
        })
      }
    } else {
      handleNpcAdvisory(nearbyNpc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyNpc, bondMeter, activeQuiz, quizLoading, handleNpcAdvisory, currentLevel, getTaskChainId, questState])

  // Phase 3A — a fixed story NPC's greeting (clickable-only: Help / Not
  // right now), leading into the new WhatsApp-style advisory
  // conversation (see useAdvisoryConversation.js + advisoryScripts.js) —
  // NOT the old LLM-quiz pipeline, which is still used for anonymous
  // wandering-NPC encounters (see handleNpcAdvisory above) since those
  // have no written script to run.
  const handleFixedNpcInteract = useCallback(() => {
    if (!nearbyFixedNpc || narrative.isActive || activeQuiz || quizLoading || advisoryConversation.isActive) return
    // Level 1's strict sequence -- if this NPC isn't the currently
    // required step (e.g. player reaches Riya before finishing Arjun's
    // required chain), gently redirect instead of opening the wrong
    // conversation. Doesn't apply once the sequence is done (level1NextRequiredStep
    // becomes null) or to any level other than 1.
    if (level1NextRequiredStep && level1NextRequiredStep !== nearbyFixedNpc.id
      && LEVEL_1_SEQUENCE.includes(nearbyFixedNpc.id)) {
      narrative.play({
        speaker: 'companion',
        animation: null,
        lines: [`Let's finish what's in front of us first -- ${LEVEL_1_SEQUENCE_LABELS[level1NextRequiredStep] || 'that'} first.`],
      })
      return
    }
    narrative.play(nearbyFixedNpc.greetingBeat, {}, (choice) => {
      if (choice === 'help') advisoryConversation.start(nearbyFixedNpc.id)
    })
  }, [nearbyFixedNpc, narrative, activeQuiz, quizLoading, advisoryConversation, level1NextRequiredStep, LEVEL_1_SEQUENCE, LEVEL_1_SEQUENCE_LABELS])

  // Applies the same reward weight as any other quest-equivalent NPC
  // help (completeAdvisorySuccess's old logic) once the player reaches
  // a genuine resolution — NOT the short "spend now"/decline close,
  // which has no written payoff arc and isn't reward-worthy the same way.
  const hasRewardedAdvisoryRef = useRef(false)
  useEffect(() => {
    if (advisoryConversation.phase !== 'done' || !advisoryConversation.reachedFullResolution) {
      hasRewardedAdvisoryRef.current = false
      return
    }
    if (hasRewardedAdvisoryRef.current) return
    hasRewardedAdvisoryRef.current = true

    addBond(BOND_REWARDS.quest)
    playSuccessSound()
    setLevelTaskProgress((prev) => {
      const npcId = advisoryConversation.npcId
      // This exact NPC was already recorded as done earlier this level --
      // don't let re-finishing them (or a stale re-fire of this effect)
      // count a second time.
      if ((prev.completedNpcIds || []).includes(npcId)) return prev
      const nextCompletedIds = [...(prev.completedNpcIds || []), npcId]

      if (currentLevel === 1) {
        // Level 1's 5 chain slots are fixed to the explicit sequence
        // (companion, arjun, memory_match, cash_flow_catch, riya) -- so
        // Arjun and Riya each own their own slot instead of sharing a
        // single "first NPC" slot the old quota logic used. This is what
        // makes finishing Riya actually end the level: her slot (4) is
        // the chain's last, so completing her tips completed.size to 5.
        // Meera (or any other NPC) is bonus content here -- still marked
        // done on the board via completedNpcIds, but no chain slot.
        const LEVEL_1_NPC_SLOTS = { arjun: 1, riya: 4 }
        const slotIndex = LEVEL_1_NPC_SLOTS[npcId]
        if (slotIndex !== undefined) {
          const chainId = getTaskChainId(slotIndex)
          if (chainId) questState.completeQuest(chainId)
        }
        return { ...prev, completedNpcIds: nextCompletedIds }
      }

      if (prev.npcHelpCount >= NPC_HELP_QUOTA) {
        // The quota's already been met by an earlier NPC -- this one
        // still gets marked done on the notice board (that's the whole
        // fix: completedNpcIds tracks THIS specific person, so their
        // card can actually flip to done instead of the arrow looping
        // back to them forever), it just doesn't advance the required
        // chain slot or counter any further.
        return { ...prev, completedNpcIds: nextCompletedIds }
      }

      const slotIndex = prev.npcHelpCount
      const chainId = getTaskChainId(slotIndex)
      if (chainId) questState.completeQuest(chainId)
      return { ...prev, npcHelpCount: prev.npcHelpCount + 1, completedNpcIds: nextCompletedIds }
    })
    setSystemNotice(`🤝 Helped ${advisoryConversation.npcName}!`)

    // "Completed" effect instead of a badge popup -- the same checkpoint
    // banner + 3D particle burst every other completion gets (mini-game,
    // capstone), anchored on the player since there's no building tied
    // to an NPC conversation. Level 1's only badge is the level 1 -> 2
    // transition badge (see the level-up effect below) -- every other
    // completion, including this one, is celebrated but doesn't queue
    // its own badge popup.
    setActiveEffect({
      position: playerPos ? [playerPos.x, 0, playerPos.z] : [0, 0, 0],
      label: `Helped ${advisoryConversation.npcName}`,
    })

    // The funnel line still fires as a companion beat once the
    // conversation closes and the badge above has been queued, so the
    // written funnel content plays out right after the celebratory moment
    // rather than competing with it.
    if (advisoryConversation.funnelLine) {
      setTimeout(() => {
        narrative.play({ speaker: 'companion', animation: 'yes', lines: [advisoryConversation.funnelLine] })
      }, 600)
    }
  }, [advisoryConversation.phase, advisoryConversation.reachedFullResolution, advisoryConversation.npcId, advisoryConversation.npcName, advisoryConversation.funnelLine, addBond, playSuccessSound, currentLevel, getTaskChainId, questState, NPC_HELP_QUOTA, narrative, playerPos])

  const handleUseHint = useCallback(async (questionText) => {
    if (hintScrolls <= 0) return null

    const questId = activeQuestId || activeTreasureId
    const topic = activeQuestId
      ? QUEST_META[activeQuestId]?.topic
      : treasureSpots.find((t) => t.id === activeTreasureId)?.topic

    const agentResponse = await generateQuizFromBackend({
      requestType: 'HINT_SCROLL',
      userProfile: buildUserProfileForAgent(),
      questContext: { quest_id: questId, topic, current_question_text: questionText || activeQuiz?.question || '' },
    })

    let hintText = null
    if (agentResponse) {
      const payload = agentResponse.HINT_SCROLL || agentResponse.hint_scroll || agentResponse
      hintText = payload.hint_text || payload.hint || (typeof payload === 'string' ? payload : null)
    }
    hintText = hintText || activeQuiz?.hint || null

    setHintScrolls((prev) => Math.max(0, prev - 1))
    return hintText
  }, [activeQuestId, activeTreasureId, activeQuiz, treasureSpots, hintScrolls, buildUserProfileForAgent])

  const handleRetryEasy = useCallback(async () => {
    const questId = activeQuestId || activeTreasureId
    if (!questId) return
    const fallbackQuiz = buildGenericFallbackQuiz(questId)

    const agentResponse = await generateQuizFromBackend({
      requestType: activeQuestId ? 'MAIN_QUEST' : 'ROAD_TREASURE',
      userProfile: buildUserProfileForAgent(),
      questContext: {
        quest_id: questId,
        topic: activeQuestId
          ? QUEST_META[activeQuestId]?.topic
          : treasureSpots.find((t) => t.id === activeTreasureId)?.topic,
        current_question_text: activeQuiz?.question || '',
      },
      performanceState: { current_difficulty: 'easy', last_question_attempts: 3 },
    })

    const normalized = normalizeQuizPayload(agentResponse, fallbackQuiz.reward)
    setActiveQuiz(normalized || fallbackQuiz)
  }, [activeQuestId, activeTreasureId, activeQuiz, treasureSpots, buildUserProfileForAgent, normalizeQuizPayload, buildGenericFallbackQuiz])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'KeyE' && effectiveNearbyQuest?.questId && !activeQuiz) {
        handleCapstoneInteract()
      } else if (e.code === 'KeyE' && nearbyCompanionToRepair && companionPhase === 'placed') {
        setCompanionPhase('repairing')
      } else if (e.code === 'KeyE' && nearbyMiniGameSpot && !miniGameHubOpen) {
        handleMiniGameSpotInteract()
      } else if (e.code === 'KeyE' && nearbyFixedNpc && !narrative.isActive) {
        handleFixedNpcInteract()
      } else if (e.code === 'KeyE' && nearbyNpc && !narrative.isActive) {
        handleNpcInteract()
      } else if (e.code === 'Escape') {
        if (activeQuiz) {
          setActiveQuiz(null)
          setActiveQuestId(null)
          setActiveTreasureId(null)
        } else if (drawerOpen) {
          setDrawerOpen(false)
        } else if (mobileTrackerOpen) {
          setMobileTrackerOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [effectiveNearbyQuest, activeQuiz, drawerOpen, mobileTrackerOpen, handleCapstoneInteract, nearbyCompanionToRepair, companionPhase, nearbyMiniGameSpot, miniGameHubOpen, nearbyFixedNpc, handleFixedNpcInteract, nearbyNpc, handleNpcInteract, handleMiniGameSpotInteract])

  const models = getDiscoveredModels()

  const urlByFilename = Object.fromEntries(
    models.map((m) => [`${m.name}.glb`, m.url])
  )

  const completedCount = questState.chain.filter((id) =>
    questState.isComplete(id)
  ).length

  const activeQuestIdInChain = questState.chain.find((id) => !questState.isComplete(id))

  // Kept current on every render so the resume-nudge timeout (armed once,
  // way back in the sync effect near the top of this component) can read
  // fresh values at fire-time instead of a stale closure from whichever
  // render first set up that timeout.
  const latestGuidanceRef = useRef(null)
  latestGuidanceRef.current = { companionPhase, companionSpawn, activeQuestIdInChain, questState }

  // Movement-aware guidance check — runs every 10s, but only actually
  // SHOWS a line when it means something: sustained lack of progress
  // (~30s of not getting closer) triggers a gentle nudge, and genuinely
  // nearing the target triggers one encouraging line. This avoids both
  // extremes — a flat 60s timer that ignores what the player's actually
  // doing, and a line popping up every single 10s tick regardless of
  // movement (which would just be spam).
  const lastDistanceRef = useRef(null)
  const notApproachingStreakRef = useRef(0)
  const hasShownGettingCloseForTargetRef = useRef(null) // which target id it was last shown for
  useEffect(() => {
    const CHECK_INTERVAL_MS = 10000
    const NOT_APPROACHING_THRESHOLD = 3 // 3 checks * 10s = ~30s of no progress
    const NEAR_DISTANCE = 15

    const intervalId = setInterval(() => {
      const somethingElseIsActive =
        !isGameReadyRef.current ||
        narrative.isActive ||
        storyNarrator.isActive ||
        !!activeQuiz ||
        quizLoading ||
        anyPanelOpen ||
        companionPhase === 'repairing' ||
        companionPhase === 'repaired' ||
        !playerPos

      if (somethingElseIsActive) return

      // Figure out the current target (companion, the Level 1 fixed
      // sequence's next required step, or the active quest building) and
      // its position — nothing to check against otherwise.
      let targetId = null
      let targetPos = null
      let targetLabel = null
      if (companionPhase !== 'done' && companionSpawn) {
        targetId = 'companion'
        targetPos = { x: companionSpawn[0], z: companionSpawn[2] }
      } else if (currentLevel === 1 && level1NextRequiredStep) {
        // Level 1's fixed sequence (Arjun / Memory Match / Cash Flow
        // Catch / Riya) never routes through questState.questBuildings at
        // all -- Arjun/Riya live in fixedStoryNpcPositions and the two
        // mini-games live in miniGameSpawns, both entirely separate from
        // the generic quest-building system the branch below still
        // checks. Without this branch, targetId/targetPos stayed null for
        // this whole stretch, so the nudge system went silent between
        // every one of these five tasks -- same posLookup pattern as the
        // ground-arrow target (level1SequenceTarget) uses.
        const posLookup = {
          arjun: fixedStoryNpcPositions['arjun'],
          memory_match: miniGameSpawns['memory_match'],
          cash_flow_catch: miniGameSpawns['cash_flow_catch'],
          riya: fixedStoryNpcPositions['riya'],
        }
        const pos = posLookup[level1NextRequiredStep]
        if (pos) {
          targetId = `level1_${level1NextRequiredStep}`
          targetPos = { x: pos[0], z: pos[2] }
          targetLabel = LEVEL_1_SEQUENCE_LABELS[level1NextRequiredStep] || level1NextRequiredStep
        }
      } else if (activeQuestIdInChain) {
        const building = questState.questBuildings[activeQuestIdInChain]
        if (building?.render_x !== undefined) {
          targetId = activeQuestIdInChain
          targetPos = { x: building.render_x, z: building.render_z }
          targetLabel = questState.questLabels[activeQuestIdInChain] ?? activeQuestIdInChain
        }
      }

      if (!targetId || !targetPos) {
        lastDistanceRef.current = null
        notApproachingStreakRef.current = 0
        return
      }

      const currentDistance = Math.hypot(playerPos.x - targetPos.x, playerPos.z - targetPos.z)

      // Target changed since the last check (e.g. companion just got
      // repaired, or a quest just completed) — reset tracking rather than
      // comparing distances to two different places.
      if (lastDistanceRef.current === null || lastDistanceRef.current.targetId !== targetId) {
        lastDistanceRef.current = { targetId, distance: currentDistance }
        notApproachingStreakRef.current = 0
        return
      }

      const gotCloser = currentDistance < lastDistanceRef.current.distance - 0.5 // small buffer against jitter
      lastDistanceRef.current = { targetId, distance: currentDistance }

      if (gotCloser) {
        notApproachingStreakRef.current = 0

        if (currentDistance < NEAR_DISTANCE && hasShownGettingCloseForTargetRef.current !== targetId) {
          hasShownGettingCloseForTargetRef.current = targetId
          if (companionPhase !== 'done') {
            storyNarrator.playRepeatable('companion_getting_close')
          } else {
            companionNudge.show('quest_getting_close', {
              questLabel: targetLabel ?? targetId,
            })
          }
        }
      } else {
        notApproachingStreakRef.current += 1

        if (notApproachingStreakRef.current >= NOT_APPROACHING_THRESHOLD) {
          notApproachingStreakRef.current = 0 // re-arm for another ~30s of no progress, not immediate repeat
          if (companionPhase !== 'done') {
            storyNarrator.playRepeatable('companion_not_approaching')
          } else {
            companionNudge.show('quest_not_approaching', {
              questLabel: targetLabel ?? targetId,
            })
          }
        }
      }
    }, CHECK_INTERVAL_MS)

    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companionPhase, activeQuestIdInChain, activeQuiz, quizLoading, anyPanelOpen, companionSpawn, currentLevel, level1NextRequiredStep, fixedStoryNpcPositions, miniGameSpawns, LEVEL_1_SEQUENCE_LABELS])

  // Level-scoped task count for the HUD pill — "3/5" within the current
  // level's 5 quests, not "3/25" across the whole 25-quest curriculum.
  const currentLevelQuestIds = questState.chain.slice(
    (questState.levelInfo.level - 1) * 5,
    questState.levelInfo.level * 5
  )
  const currentLevelCompletedCount = currentLevelQuestIds.filter((id) => questState.isComplete(id)).length

  const handleLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  const handleCoinCollect = useCallback((id, reward) => {
    setCollectedCoinIds((prev) => new Set(prev).add(id))
    setBonusCoins((prev) => prev + (reward || 10))
    playRewardSound('coin')
  }, [playRewardSound])

  // Companion flow handlers

  const handleStartCompanionRepair = useCallback(() => {
    if (companionPhase !== 'placed') return
    setCompanionPhase('repairing')
  }, [companionPhase])

  // "Let them win": the player's very first objective is a single tap that
  // cannot be failed, not a memory test. Brand-new players get a fast win
  // here; the harder content starts once the companion is following.
  const UNLOCK_SEQUENCE_LENGTH = 1
  const UNLOCK_TILE_SHOW_MS = 550
  const UNLOCK_TILE_GAP_MS = 250

  const playUnlockSequence = useCallback((sequence) => {
    setUnlockPhase('showing')
    sequence.forEach((tileIndex, i) => {
      const showAt = i * (UNLOCK_TILE_SHOW_MS + UNLOCK_TILE_GAP_MS)
      setTimeout(() => setUnlockLitTile(tileIndex), showAt)
      setTimeout(() => setUnlockLitTile(null), showAt + UNLOCK_TILE_SHOW_MS)
    })
    setTimeout(() => {
      setUnlockPhase('input')
      setUnlockPlayerIndex(0)
      // Leave the panel glowing through the input phase, so there's an obvious
      // "tap here" affordance rather than a recall test.
      setUnlockLitTile(sequence[0] ?? null)
    }, sequence.length * (UNLOCK_TILE_SHOW_MS + UNLOCK_TILE_GAP_MS) + 150)
  }, [])

  // Lights the panel the moment the companion becomes interactable. This was
  // a 4-tile memory puzzle; it's deliberately a one-tap beat now so the
  // opening objective is short and impossible to fail.
  useEffect(() => {
    if (companionPhase !== 'repairing') return
    const sequence = Array.from({ length: UNLOCK_SEQUENCE_LENGTH }, () => Math.floor(Math.random() * 4))
    setUnlockSequence(sequence)
    playUnlockSequence(sequence)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companionPhase])

  const handleUnlockTileTap = useCallback(() => {
    if (unlockPhase !== 'input') return
    // Any panel counts — there is no wrong answer on the first objective.
    setUnlockPlayerIndex(unlockSequence.length)
    setUnlockLitTile(null)
    setTimeout(() => setCompanionPhase('repaired'), 350)
  }, [unlockPhase, unlockSequence.length])

  const handleConfirmCompanionName = useCallback(() => {
    if (!companionNameInput.trim() || !selectedCompanionData) return
    saveUserProfile({
      companionId: selectedCompanionData.id,
      companionName: companionNameInput.trim(),
    })
    setCompanionPhase('done')
    // Silently completes Level 1's slot 0 in the underlying chain engine
    // (coins/level-up math), even though the player only ever interacted
    // with the companion, never an old "quest building."
    const slot0Id = getTaskChainId(0)
    if (slot0Id) questState.completeQuest(slot0Id)
  }, [companionNameInput, selectedCompanionData, getTaskChainId, questState])

  const handleEnterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape')
      }
    } catch (err) {
      // Silently ignore — iOS Safari and some browsers don't support one or
      // both APIs, or require a direct user gesture we may not have here.
      console.warn('Fullscreen/orientation lock not available:', err)
    }
  }

  const currentScenario = profile.scenario || questState.scenario || 'student'

  // Shared minimap content — a plain function, not a component, so the
  // exact same markers render at any size (the small HUD card and the
  // expanded overlay both just wrap this in a differently-sized <svg>,
  // relying on the viewBox to scale everything automatically).
  // Notice Board content — same task data Mission Tracker already
  // computes, just packaged as flip-cards instead of a list. "Help a
  // neighbor" stays generic (icon, not a named portrait) until real NPC
  // images are supplied — add an `image` field per notice once they are.
  // Weight reflects how much each task actually matters, not just "1 of
  // N" — the capstone is the level's real climax, so it counts for more
  // toward the progress bar than a quick mini-game or a single neighbor
  // chat, even though they're all "one task" each.
  const TASK_WEIGHTS = { companion: 2, npcHelp: 1, recognition: 1, minigame: 1, capstone: 3 }
  // Level 1's exact required weighting (per explicit request), summing to
  // 100 across the 5 real steps -- companion / Arjun / Memory Match /
  // Cash Flow Catch / Riya. Everything else visible in Level 1 (Meera,
  // Vikram, Aahan, recognition, the capstone) is bonus content and
  // intentionally contributes 0 toward this total.
  const LEVEL_1_WEIGHTS = { companion: 10, arjun: 30, memory_match: 15, cash_flow_catch: 15, riya: 30 }

  const noticeBoardItems = []
  // All 5 written NPCs (see advisoryScripts.js) now get a card, each
  // showing the ACTUAL problem they have -- these `flow` lines are the
  // real `dilemmaLine` from their advisory script, not a shortened
  // paraphrase, so what the board promises matches what the
  // conversation actually opens with.
  //
  // Arjun/Riya/Meera are wired into the walkable city as
  // FIXED_STORY_NPCS (real pin positions below); Vikram/Aahan don't
  // have a placed character yet, so their cards render without a
  // "Pin on map" button until that's done -- same honest-limitation
  // pattern as before, just now covering 2 cards instead of 0.
  const npcCharacters = [
    { id: 'arjun', name: 'Arjun', image: npcPortrait1, flow: "Salary just came in. First month I've actually got enough to think past just getting by. My friend's group trip booking closes today -- need to decide fast.", hand: 'nb-hand-1' },
    { id: 'riya', name: 'Riya', image: npcPortrait2, flow: "Just got ₹2,000 as a surprise gift. The sneakers I've been stalking for months just went on a 3-hour flash sale...", hand: 'nb-hand-2' },
    { id: 'meera', name: 'Meera', image: npcPortrait3, flow: "This month's actually been great, way more orders than usual. A supplier's offering bulk materials at a discount -- only today.", hand: 'nb-hand-3' },
    { id: 'vikram', name: 'Vikram', image: npcPortrait4, flow: "Got a bonus of ₹10,000, but my credit card bill is due, my gym membership auto-renewed, and my friends are planning a lavish weekend getaway.", hand: 'nb-hand-4' },
    { id: 'aahan', name: 'Aahan', image: npcPortrait5, flow: "Big crossroads. I've saved up ₹1.5 Lakhs. Do I dump it into a high-risk crypto trend, split it with an index fund, or park it safely in a liquid debt fund?", hand: 'nb-hand-5' },
  ]
  // Shows ALL characters as available options, not just however many the
  // quota strictly requires — "here's who you could help," matching the
  // no-strict-task-list direction. The actual coin/level completion
  // requirement (NPC_HELP_QUOTA) is unchanged underneath; this only
  // changes what the board displays.
  npcCharacters.forEach((character, i) => {
    // These 3 NPCs are no longer anonymous wandering encounters -- they're
    // FIXED_STORY_NPCS with real, stable world positions (see
    // fixedStoryNpcPositions above), so they can now get real map pins
    // in sequence like any other objective, instead of the null this
    // used to be back when the encounter was "any nearby wandering NPC."
    const fixedPos = fixedStoryNpcPositions[FIXED_STORY_NPCS[i]?.id]
    noticeBoardItems.push({
      id: `npc-help-${i}`,
      image: character.image,
      title: character.name,
      flow: character.flow,
      handClass: character.hand,
      // Keyed to THIS specific NPC's id, not a shared counter -- fixes
      // the arrow looping back to Riya forever once Arjun alone had
      // already satisfied the level's quota (see completedNpcIds in
      // levelTaskStorage.js for the full story). Now finishing Riya's
      // own conversation is what marks Riya's own card done, full stop.
      done: (levelTaskProgress.completedNpcIds || []).includes(character.id),
      // Only the first NPC_HELP_QUOTA cards count toward the progress
      // bar's total — the rest are genuinely optional extras, visible as
      // real choices but not required to hit 100%, matching "options,
      // not a strict list."
      weight: currentLevel === 1
        ? (LEVEL_1_WEIGHTS[character.id] || 0)
        : (i < NPC_HELP_QUOTA ? TASK_WEIGHTS.npcHelp : 0),
      pinPosition: fixedPos ? { x: fixedPos[0], z: fixedPos[2] } : null,
    })
  })
  if (currentLevel === 1) {
    noticeBoardItems.push({
      id: 'recognition',
      icon: '👋',
      title: "Earn the City's Recognition",
      flow: 'Keep helping people — eventually, someone will recognize you.',
      done: levelTaskProgress.recognitionDone,
      // Bonus flavor only in Level 1's fixed sequence -- doesn't count
      // toward the required 100% (see LEVEL_1_WEIGHTS above).
      weight: 0,
      pinPosition: null,
    })
  }
  if (currentLevel === 1) {
    // Level 1's fixed sequence calls out Memory Match and Cash Flow Catch
    // as their own cards, each worth its own slice of the 100%, instead
    // of one generic "beat any mini-game" card.
    const memoryMatchSpawn = miniGameSpawns['memory_match']
    const cashFlowCatchSpawn = miniGameSpawns['cash_flow_catch']
    noticeBoardItems.push({
      id: 'minigame-memory-match',
      icon: '🎮',
      title: 'Memory Match',
      flow: 'Clear the Memory Match mini-game spot in the city.',
      done: (levelTaskProgress.completedMinigameIds || []).includes('memory_match'),
      weight: LEVEL_1_WEIGHTS.memory_match,
      pinPosition: memoryMatchSpawn ? { x: memoryMatchSpawn[0], z: memoryMatchSpawn[2] } : null,
    })
    noticeBoardItems.push({
      id: 'minigame-cash-flow-catch',
      icon: '🎮',
      title: 'Cash Flow Catch',
      flow: 'Clear the Cash Flow Catch mini-game spot in the city.',
      done: (levelTaskProgress.completedMinigameIds || []).includes('cash_flow_catch'),
      weight: LEVEL_1_WEIGHTS.cash_flow_catch,
      pinPosition: cashFlowCatchSpawn ? { x: cashFlowCatchSpawn[0], z: cashFlowCatchSpawn[2] } : null,
    })
  } else {
    noticeBoardItems.push({
      id: 'minigame',
      icon: '🎮',
      title: 'Clear a Mini-Game',
      flow: 'Any of the 3 mini-game spots around the city -- beat one challenge.',
      done: levelTaskProgress.minigameDone,
      weight: TASK_WEIGHTS.minigame,
      // Points at the first of the 3 spread-out spots as a reasonable
      // default pin -- the task itself doesn't care which specific game
      // gets cleared, so this is just "somewhere to start," not a
      // requirement to visit this exact one.
      pinPosition: miniGameSpawns[MINIGAME_TYPES[0]?.id]
        ? { x: miniGameSpawns[MINIGAME_TYPES[0].id][0], z: miniGameSpawns[MINIGAME_TYPES[0].id][2] }
        : null,
    })
  }
  const capstoneBuildingForPin = capstoneChainId ? questState.questBuildings[capstoneChainId] : null
  noticeBoardItems.push({
    id: 'capstone',
    icon: '🏆',
    title: LEVEL_CAPSTONE_QUESTS[currentLevel]?.label || 'Capstone Mission',
    flow: "The city's biggest ask this level — save it for when you're ready.",
    done: levelTaskProgress.capstoneDone,
    // Bonus content in Level 1 -- doesn't count toward the required 100%
    // (see LEVEL_1_WEIGHTS above); unchanged for every other level.
    weight: currentLevel === 1 ? 0 : TASK_WEIGHTS.capstone,
    pinPosition: capstoneBuildingForPin?.render_x !== undefined
      ? { x: capstoneBuildingForPin.render_x, z: capstoneBuildingForPin.render_z }
      : null,
  })

  const noticeBoardWeightDone = noticeBoardItems.reduce((sum, n) => sum + (n.done ? n.weight : 0), 0)
  const noticeBoardWeightTotal = noticeBoardItems.reduce((sum, n) => sum + n.weight, 0)
  // Level 1 uses its own exact 10/30/15/15/30 formula rather than the
  // generic card-weight reduce above -- companion has no visible notice
  // board card (it's finished before the board is ever really used), so
  // it has to be folded in explicitly for the bar to reach a true 100%
  // right when Riya (the last step) completes.
  const noticeBoardProgressPct = currentLevel === 1
    ? Math.round(
        (companionPhase === 'done' ? LEVEL_1_WEIGHTS.companion : 0)
          + ((levelTaskProgress.completedNpcIds || []).includes('arjun') ? LEVEL_1_WEIGHTS.arjun : 0)
          + ((levelTaskProgress.completedMinigameIds || []).includes('memory_match') ? LEVEL_1_WEIGHTS.memory_match : 0)
          + ((levelTaskProgress.completedMinigameIds || []).includes('cash_flow_catch') ? LEVEL_1_WEIGHTS.cash_flow_catch : 0)
          + ((levelTaskProgress.completedNpcIds || []).includes('riya') ? LEVEL_1_WEIGHTS.riya : 0)
      )
    : (noticeBoardWeightTotal > 0 ? Math.round((noticeBoardWeightDone / noticeBoardWeightTotal) * 100) : 0)

  // The pin only means something while that task still has an actual
  // fixed spot AND isn't already done — auto-clears itself in either
  // case rather than pointing at a stale or finished objective.
  const pinnedNotice = noticeBoardItems.find((n) => n.id === pinnedTaskId)
  const activePinPosition = pinnedNotice && !pinnedNotice.done ? pinnedNotice.pinPosition : null

  // The level's objectives that have a real location, in the order the player
  // should tackle them. This one ordered list feeds both the numbered minimap
  // markers and the ground arrows, so the two can never disagree about what
  // "next" means.
  const orderedObjectives = noticeBoardItems
    .filter((n) => n.pinPosition)
    .map((n, i) => ({ ...n, order: i + 1 }))

  // Level 1's strict sequence needs its OWN arrow target -- the generic
  // fallback below just finds the first undone item in a fixed array
  // order (companion, then each NPC by array position, then minigame),
  // which has no idea Memory Match/Cash Flow Catch need to happen before
  // Riya. Without this override, the arrows pointed at Riya the moment
  // Arjun was done, even though the companion was correctly telling the
  // player to go do Memory Match first -- exactly the reported bug.
  // Built directly from the raw spawn positions rather than routing
  // through noticeBoardItems, since the mini-games don't have distinct
  // per-game notice-board entries (just one generic "minigame" card).
  const level1SequenceTarget = (() => {
    if (!level1NextRequiredStep) return null
    const posLookup = {
      companion: companionSpawn,
      arjun: fixedStoryNpcPositions['arjun'],
      memory_match: miniGameSpawns['memory_match'],
      cash_flow_catch: miniGameSpawns['cash_flow_catch'],
      riya: fixedStoryNpcPositions['riya'],
    }
    const pos = posLookup[level1NextRequiredStep]
    if (!pos) return null
    return {
      id: `level1_sequence_${level1NextRequiredStep}`,
      pinPosition: { x: pos[0], z: pos[2] },
      done: false,
    }
  })()

  // Where the arrows point: the level-1 sequence target wins outright
  // (pointing anywhere else would contradict what the companion is
  // telling the player), then an explicitly pinned task, then the
  // next unfinished objective in sequence.
  const currentObjective =
    level1SequenceTarget ||
    (pinnedNotice && !pinnedNotice.done && pinnedNotice.pinPosition
      ? orderedObjectives.find((n) => n.id === pinnedNotice.id)
      : null) || orderedObjectives.find((n) => !n.done) || null
  const objectiveArrowColor = activePinPosition
    ? '#f472b6'
    : OBJECTIVE_COLORS[currentObjective?.id] || '#38bdf8'

  const renderMinimapMarkers = () => (
    <>
      {layout?.roads
        ?.filter((road) =>
          Math.abs(road.render_x - minimapCenter.x) <= MINIMAP_VIEW_RADIUS + 5 &&
          Math.abs(road.render_z - minimapCenter.z) <= MINIMAP_VIEW_RADIUS + 5
        )
        .map((road, idx) => (
          <rect
            key={`road-${idx}`}
            x={toMinimapX(road.render_x) - 4}
            y={toMinimapZ(road.render_z) - 4}
            width={8}
            height={8}
            fill="#334155"
          />
        ))}

      {layout?.buildings
        ?.filter((b) =>
          Math.abs(b.render_x - minimapCenter.x) <= MINIMAP_VIEW_RADIUS + 5 &&
          Math.abs(b.render_z - minimapCenter.z) <= MINIMAP_VIEW_RADIUS + 5
        )
        .map((b, idx) => (
          <rect
            key={`bldg-${idx}`}
            x={toMinimapX(b.render_x) - 5}
            y={toMinimapZ(b.render_z) - 5}
            width={10}
            height={10}
            fill="#475569"
            rx="1"
          />
        ))}

      {/* Sequence route — connects the player through every remaining
          objective in level order (companion → NPC help → recognition →
          mini-game → capstone), so the map reads as "do this, then this"
          instead of a scatter of unrelated pins. Numbered badges for the
          same list are drawn later, on top of the per-type icons below. */}
      {orderedObjectives.some((n) => !n.done) && (
        <polyline
          points={[
            { x: playerPos?.x ?? orderedObjectives.find((n) => !n.done).pinPosition.x, z: playerPos?.z ?? orderedObjectives.find((n) => !n.done).pinPosition.z },
            ...orderedObjectives.filter((n) => !n.done).map((n) => n.pinPosition),
          ]
            .map((p) => `${toMinimapX(p.x)},${toMinimapZ(p.z)}`)
            .join(' ')}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="2 3"
          opacity="0.55"
        />
      )}

      {/* Only the capstone building is a real interactable location now —
          the other 4 old quest-chain buildings per level are inert (see
          the FloatingGenieIcon/CheckpointRing suppression above), so the
          minimap shouldn't draw a path through or mark them either. */}
      {capstoneChainId && !questState.isLocked(capstoneChainId) && questState.questBuildings[capstoneChainId]?.render_x !== undefined && (
        <line
          x1={toMinimapX(playerPos?.x ?? questState.questBuildings[capstoneChainId].render_x)}
          y1={toMinimapZ(playerPos?.z ?? questState.questBuildings[capstoneChainId].render_z)}
          x2={toMinimapX(questState.questBuildings[capstoneChainId].render_x)}
          y2={toMinimapZ(questState.questBuildings[capstoneChainId].render_z)}
          stroke="#F2A93B"
          strokeWidth="2.5"
          strokeDasharray="4 2"
          opacity="0.6"
        />
      )}

      {capstoneChainId && !questState.isLocked(capstoneChainId) && (() => {
        const building = questState.questBuildings[capstoneChainId]
        if (!building || building.render_x === undefined) return null

        const cx = toMinimapX(building.render_x)
        const cz = toMinimapZ(building.render_z)
        const isDone = questState.isComplete(capstoneChainId)

        return (
          <g>
            <circle
              cx={cx}
              cy={cz}
              r={6}
              fill={isDone ? '#2e8b57' : '#F2A93B'}
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {!isDone && (
              <text x={cx} y={cz} fontSize="6" textAnchor="middle" dominantBaseline="central">
                🏆
              </text>
            )}
          </g>
        )
      })()}

      {/* Companion marker — only relevant while it's still out there
          waiting to be repaired; once it's following you (companionPhase
          'done'), its position IS your position, so a separate marker
          would just sit on top of the player dot. */}
      {companionSpawn && companionPhase !== 'done' && (
        <g>
          <circle
            cx={toMinimapX(companionSpawn[0])}
            cy={toMinimapZ(companionSpawn[2])}
            r="5"
            fill="#8b5cf6"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <text
            x={toMinimapX(companionSpawn[0])}
            y={toMinimapZ(companionSpawn[2])}
            fontSize="6"
            textAnchor="middle"
            dominantBaseline="central"
          >
            🔧
          </text>
        </g>
      )}

      {/* Fixed story NPCs (Arjun, Riya, Meera) — always shown, since
          unlike the companion/capstone these aren't "done" once talked
          to (helping them isn't gated the same way; they stay around). */}
      {FIXED_STORY_NPCS.map((npc) => {
        const pos = fixedStoryNpcPositions[npc.id]
        if (!pos) return null
        return (
          <g key={npc.id}>
            <circle
              cx={toMinimapX(pos[0])}
              cy={toMinimapZ(pos[2])}
              r="5"
              fill="#f472b6"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <text
              x={toMinimapX(pos[0])}
              y={toMinimapZ(pos[2])}
              fontSize="6"
              textAnchor="middle"
              dominantBaseline="central"
            >
              💬
            </text>
          </g>
        )
      })}

      {MINIGAME_TYPES.map((game) => {
        const pos = miniGameSpawns[game.id]
        if (!pos) return null
        return (
          <g key={game.id}>
            <circle
              cx={toMinimapX(pos[0])}
              cy={toMinimapZ(pos[2])}
              r="4"
              fill="#22d3ee"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <text
              x={toMinimapX(pos[0])}
              y={toMinimapZ(pos[2])}
              fontSize="5"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {game.icon}
            </text>
          </g>
        )
      })}

      {/* Player-pinned objective — a distinct marker + connecting line
          from wherever the player currently is, so "where do I go next"
          is answerable at a glance instead of hunting the board again. */}
      {activePinPosition && (
        <g>
          <line
            x1={toMinimapX(playerPos?.x ?? activePinPosition.x)}
            y1={toMinimapZ(playerPos?.z ?? activePinPosition.z)}
            x2={toMinimapX(activePinPosition.x)}
            y2={toMinimapZ(activePinPosition.z)}
            stroke="#f472b6"
            strokeWidth="2"
            strokeDasharray="3 3"
            opacity="0.7"
          />
          <circle
            cx={toMinimapX(activePinPosition.x)}
            cy={toMinimapZ(activePinPosition.z)}
            r="6"
            fill="none"
            stroke="#f472b6"
            strokeWidth="2"
          >
            <animate attributeName="r" values="6;9;6" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
          </circle>
          <text
            x={toMinimapX(activePinPosition.x)}
            y={toMinimapZ(activePinPosition.z)}
            fontSize="7"
            textAnchor="middle"
            dominantBaseline="central"
          >
            📍
          </text>
        </g>
      )}

      {/* Numbered badges — same order as the sequence route above, drawn
          last so they sit on top of every per-type icon. The current
          objective's badge is filled solid; later ones are outlined only,
          so "what's next" reads at a glance from color alone. */}
      {orderedObjectives.filter((n) => !n.done).map((n) => (
        <g key={`seq-badge-${n.id}`}>
          <circle
            cx={toMinimapX(n.pinPosition.x) + 7}
            cy={toMinimapZ(n.pinPosition.z) - 7}
            r="6"
            fill={n.id === currentObjective?.id ? '#38bdf8' : '#1e293b'}
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <text
            x={toMinimapX(n.pinPosition.x) + 7}
            y={toMinimapZ(n.pinPosition.z) - 7}
            fontSize="7"
            fontWeight="700"
            fill="#ffffff"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {n.order}
          </text>
        </g>
      ))}

      {playerPos && (
        <g>
          <circle
            cx={toMinimapX(playerPos.x)}
            cy={toMinimapZ(playerPos.z)}
            r="5"
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth="2"
          >
            <animate
              attributeName="opacity"
              values="1;0.3;1"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}
    </>
  )

  return (
    <div className="game">
      {!hasEnteredGame && (
        <LoadingScreen
          isReady={assetsReady}
          onEnter={() => setHasEnteredGame(true)}
        />
      )}

      <div className="rotate-overlay">
        <div className="rotate-overlay-icon">📱</div>
        <p>For the full game experience, rotate your device to landscape.</p>
        <button onClick={handleEnterFullscreen}>Enter Fullscreen</button>
      </div>

      {companionPhase === 'repairing' && (
        <div className="companion-repair-card">
          <p className="companion-repair-card__label">
            {unlockPhase === 'showing'
              ? '🔧 Powering up the companion...'
              : '👆 Tap the glowing panel to wake it up'}
          </p>
          <div className="companion-unlock-tiles">
            {['#ef4444', '#22d3ee', '#fbbf24', '#8b5cf6'].map((color, i) => (
              <button
                key={i}
                className={`companion-unlock-tile ${unlockLitTile === i ? 'companion-unlock-tile--lit' : ''}`}
                style={{ background: color, color }}
                disabled={unlockPhase !== 'input'}
                onClick={() => handleUnlockTileTap()}
              />
            ))}
          </div>
          <div className="companion-repair-card__progress">
            <div
              className="companion-repair-card__progress-fill"
              style={{ width: `${unlockSequence.length ? Math.round((unlockPlayerIndex / unlockSequence.length) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {companionPhase === 'repaired' && (
        <div className="companion-name-card">
          <p className="companion-name-card__line">
            "...oh. Okay. Hang on — I don't think I've been awake in a while. Did you just unlock me?"
          </p>
          <p className="companion-name-card__line">
            "Huh. Cool. Okay, well — I don't actually have a name yet. What do I call myself?"
          </p>
          <input
            type="text"
            placeholder="Name your companion"
            value={companionNameInput}
            onChange={(e) => setCompanionNameInput(e.target.value)}
            maxLength={20}
          />
          <button
            className="companion-name-card__confirm-btn"
            disabled={!companionNameInput.trim()}
            onClick={handleConfirmCompanionName}
          >
            Confirm
          </button>
        </div>
      )}

      <CompanionDialogueModal
        narrative={narrative}
        narrator={storyNarrator}
        companionName={companionNameInput || savedProfile?.companionName || selectedCompanionData?.name}
        playerName={profile.name}
      />

      <AdvisoryConversationModal
        conversation={advisoryConversation}
        npcPortrait={FIXED_STORY_NPCS.find((n) => n.id === advisoryConversation.npcId)?.portrait}
      />

      {activeBadge && (
        <BadgeModal
          badge={activeBadge}
          defaultName={profile.name}
          onClose={closeBadge}
          onPublished={handleBadgePublished}
        />
      )}

      {showOnboardCta && (
        <div className="onboard-cta-dock">
          <button className="onboard-cta-btn" onClick={handleOnboardClick}>
            Continue to Onboarding →
          </button>
          <button
            className="onboard-cta-dismiss"
            onClick={() => setShowOnboardCta(false)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <IntroTourOverlay tour={introTour} />

      {activeEffect && (
        <div className="checkpoint-banner">
          <h2>🎉 CHECKPOINT PASSED!</h2>
          <p>{activeEffect.label} Completed</p>
        </div>
      )}

      {levelUpInfo && (
        <div className="level-up-overlay" onClick={() => setLevelUpInfo(null)}>
          <div className="level-up-burst" />
          <div className="level-up-content">
            <div className="level-up-star">⭐</div>
            <div className="level-up-label">LEVEL UP</div>
            <div className="level-up-number">Level {levelUpInfo.level}</div>
            <div className="level-up-title">{levelUpInfo.title}</div>
          </div>
        </div>
      )}

      {systemNotice && (
        <div className="checkpoint-banner">
          <p>{systemNotice}</p>
        </div>
      )}


      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 45, 55], fov: 50 }}
        shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{ toneMappingExposure: 1.2 }}
      >
        <Environment
          files={cdnUrl('env/sky.hdr')}
          background
          environmentIntensity={0.8}
        />

        <ambientLight intensity={0.9} />
        <directionalLight
          castShadow
          position={[60, 90, 50]}
          intensity={2.0}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-50, 40, -40]} intensity={0.8} />

        <Suspense fallback={null}>
          {layout && <City layout={layout} urlByFilename={urlByFilename} />}
          {layout && (
            <PlayerController
              layout={layout}
              questState={questState}
              avatarUrl={selectedAvatar.url} 
              onPositionChange={handlePositionChange}
              movementLocked={false}
            />
          )}
          {layout && (
            <QuestProximityManager
              playerPosRef={playerPosRef}
              questState={questState}
              onNearbyChange={setNearbyQuest}
            />
          )}
          {layout && <QuestBuildingBanners questState={questState} />}

          {layout && currentObjective?.pinPosition && (
            <ObjectiveArrows
              playerPosRef={playerPosRef}
              target={currentObjective.pinPosition}
              color={objectiveArrowColor}
            />
          )}

          {layout &&
            questState.visibleChain
              .filter((questId) => questId === capstoneChainId && !questState.isLocked(questId)) // capstone only, and only once actually unlocked
              .map((questId) => {
                const building = questState.questBuildings[questId]
                if (!building || questState.isComplete(questId)) return null

                // Center the icon over the building the same way CheckpointRing
                // does — using the raw corner coordinate (render_x/z) was
                // offsetting the icon toward the building's edge instead of
                // its middle, which is why it looked disconnected from the
                // golden ring and the building itself.
                const iconCenterX = building.render_x + (building.scaled_width || 0) / 2
                const iconCenterZ = building.render_z + (building.scaled_depth || 0) / 2

                return (
                  <FloatingGenieIcon
                    key={`genie-${questId}`}
                    position={[iconCenterX, 2.5, iconCenterZ]}
                    playerPosition={playerPos}
                    onTriggerInteract={handleCapstoneInteract}
                    label={LEVEL_CAPSTONE_QUESTS[currentLevel]?.label || questState.questLabels[questId] || questId.toUpperCase()}
                    icon="🏆"
                    activeColor="#f59e0b"
                    activeGlow="#fbbf24"
                    disabled={!!activeQuiz || anyPanelOpen}
                  />
                )
              })}

          {playerPos &&
            treasureSpots
              .filter((t) => !collectedTreasureIds.has(t.id))
              .map((t) => (
                <FloatingGenieIcon
                  key={t.id}
                  position={[t.position[0], 1.6, t.position[2]]}
                  playerPosition={playerPos}
                  onTriggerInteract={() => handleOpenTreasure(t)}
                  label="Open Treasure Chest"
                  icon="🎁"
                  activeColor="#d97706"
                  activeGlow="#fbbf24"
                  revealDistance={6}
                  disabled={!!activeQuiz || anyPanelOpen}
                />
              ))}

          {playerPos &&
            activeCoinsList
              .filter((coinItem) => !collectedCoinIds.has(coinItem.id))
              .map((coinItem) => (
                <PathCollectible
                  key={coinItem.id}
                  position={coinItem.position}
                  type="coin"
                  reward={coinItem.reward}
                  playerPosition={playerPos}
                  onCollect={() => handleCoinCollect(coinItem.id, coinItem.reward)}
                />
              ))}

          {layout &&
            questState.visibleChain.map((questId) => {
              const isCurrentActive = activeQuestIdInChain === questId
              const building = questState.questBuildings[questId]

              return (
                <CheckpointRing
                  key={questId}
                  building={building}
                  visible={questId === capstoneChainId && (questId === activeQuestIdInChain || effectiveNearbyQuest?.questId === questId)}
                  color={
                    questState.isLocked(questId)
                      ? '#4a4a4a'
                      : questState.isComplete(questId)
                      ? '#2e8b57'
                      : '#F2A93B'
                  }
                />
              )
            })}


          {activeEffect && (
            <CheckpointBurst
              position={activeEffect.position}
              onComplete={() => setActiveEffect(null)}
            />
          )}

          {selectedCompanionData && companionSpawn && companionPhase !== 'picker' && (
            <CompanionWorldModel
              modelUrl={selectedCompanionData.url}
              position={companionSpawn}
              clipKey={companionPhase === 'placed' || companionPhase === 'repairing' ? 'death' : 'wave'}
              isFollowing={companionPhase === 'done'}
              followTarget={playerPos}
              nudgeText={companionNudge.isVisible ? companionNudge.currentLine : null}
            />
          )}

          {layout &&
            npcSpawnPoints.length > 0 &&
            backgroundNpcAvatars.map((avatar, i) => (
              <WanderingNPC
                key={avatar.id}
                id={avatar.id}
                avatarUrl={avatar.url}
                roads={layout.roads}
                startPosition={npcSpawnPoints[i]}
                onPositionUpdate={handleNpcPositionUpdate}
              />
            ))}

          {layout &&
            FIXED_STORY_NPCS.map((npc, i) => {
              const pos = fixedStoryNpcPositions[npc.id]
              if (!pos || !npc.bodyUrl) return null
              return (
                <group key={npc.id}>
                  <ModelErrorBoundary label={`FixedStoryNPC: ${npc.name}`}>
                    <Suspense fallback={null}>
                      <FixedStoryNPC avatarUrl={npc.bodyUrl} position={pos} facingY={i * 2.1} />
                    </Suspense>
                  </ModelErrorBoundary>
                  <FloatingGenieIcon
                    position={[pos[0], 2, pos[2]]}
                    playerPosition={playerPos}
                    onTriggerInteract={handleFixedNpcInteract}
                    label={`Talk to ${npc.name}`}
                    icon="💬"
                    activeColor="#f472b6"
                    activeGlow="#f9a8d4"
                    revealDistance={7}
                    disabled={!!activeQuiz || narrative.isActive || anyPanelOpen}
                  />
                </group>
              )
            })}

          {MINIGAME_TYPES.map((game) => {
            const pos = miniGameSpawns[game.id]
            if (!pos || miniGameHubOpen) return null
            return (
              <FloatingGenieIcon
                key={game.id}
                position={[pos[0], 2, pos[2]]}
                playerPosition={playerPos}
                onTriggerInteract={handleMiniGameSpotInteract}
                label={`Play ${game.label}`}
                icon={game.icon}
                activeColor="#22d3ee"
                activeGlow="#67e8f9"
                revealDistance={7}
                disabled={!!activeQuiz || nearbyCompanionToRepair || !!effectiveNearbyQuest || anyPanelOpen}
              />
            )
          })}
        </Suspense>

        <Ground bounds={mapBounds} />
      </Canvas>

      <div className="hud">
        {/* TOP LEFT: ONE continuous bar — profile segment + stat segments,
            separated by thin dividers, no gaps between them. */}
        <div className="hud-top-left" data-intro-tour-id="top_bar">
          <button className="game-menu-btn" data-intro-tour-id="profile" onClick={() => setDrawerOpen(true)}>
            <span className="game-menu-icon">👤</span>
            <span>{profile.name}</span>
          </button>

          {!topBarCollapsed && (
            <>
              <button className="audio-toggle-btn" onClick={toggleMute}>
                {isMuted ? '🔇' : '🔊'}
              </button>

              <button
                className="audio-toggle-btn"
                onClick={() => setGuidePanelOpen((v) => !v)}
                title="Open guide"
                id="guide-anchor-btn"
              >
                ❓
              </button>

              <div className="stat-pill">
                <span>🎓</span>
            <div>
              <p>Scenario</p>
              <strong>{currentScenario === 'employee' ? 'Employee' : 'Student'}</strong>
            </div>
          </div>

          <div className="stat-pill">
            <span>⭐</span>
            <div>
              <p>Level {questState.levelInfo.level}</p>
              <strong>{questState.levelInfo.title}</strong>
            </div>
          </div>

          <div className={`stat-pill${coinPop ? ' stat-pill--coin-pop' : ''}`}>
            <span>🪙</span>
            <div>
              <p>Coins</p>
              <strong>{totalCoins}</strong>
            </div>
          </div>

          <div className="stat-pill">
            <span>📋</span>
            <div>
              <p>Tasks</p>
              <strong>{currentLevelCompletedCount}/{currentLevelQuestIds.length}</strong>
            </div>
          </div>

          <div className="stat-pill">
            <span>🔥</span>
            <div>
              <p>Streak</p>
              <strong>{streakInfo.count} day{streakInfo.count === 1 ? '' : 's'}</strong>
            </div>
          </div>

          <div className="stat-pill">
            <span>❄️</span>
            <div>
              <p>Freezers</p>
              <strong>{streakInfo.freezers}</strong>
            </div>
          </div>

          <div className="stat-pill">
            <span>📜</span>
            <div>
              <p>Hint Scrolls</p>
              <strong>{hintScrolls}</strong>
            </div>
          </div>

          <div className="stat-pill">
            <span>🤝</span>
            <div>
              <p>Trust</p>
              <strong>{bondMeter}</strong>
            </div>
          </div>

          <button className="stat-pill stat-pill--clickable" onClick={() => setLeaderboardOpen((v) => !v)}>
            <span>🏆</span>
            <div>
              <p>Rankings</p>
              <strong>Leaderboard</strong>
            </div>
          </button>
            </>
          )}

          <button
            className="top-bar-collapse-btn"
            onClick={() => setTopBarCollapsed((v) => !v)}
            title={topBarCollapsed ? 'Show top bar' : 'Collapse top bar'}
          >
            {topBarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* MOBILE OVERLAY TOGGLE BUTTON */}
        <button
          className="mobile-tracker-toggle"
          onClick={() => setMobileTrackerOpen(!mobileTrackerOpen)}
        >
          {mobileTrackerOpen ? '❌ Close Info' : '🗺️ Map & Tasks'}
        </button>

        {/* HUD RIGHT PANEL */}
        <div className={`hud-right ${mobileTrackerOpen ? 'open' : ''}`}>
          <div
            className="minimap-card"
           
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => setMinimapExpanded(true)}
          >
            <h3>Live Blueprint Minimap <span className="minimap-expand-hint">(tap to expand)</span></h3>
            <svg
              width="100%"
              height="140"
              viewBox="0 0 200 200"
              style={{ background: '#0f172a', borderRadius: '8px', display: 'block' }}
            >
              {renderMinimapMarkers()}
            </svg>
          </div>

          {minimapExpanded && (
            <div className="minimap-expanded-overlay" onClick={() => setMinimapExpanded(false)}>
              <div className="minimap-expanded-card" onClick={(e) => e.stopPropagation()}>
                <div className="minimap-expanded-header">
                  <h3>Live Blueprint Minimap</h3>
                  <button className="minimap-close-btn" onClick={() => setMinimapExpanded(false)}>
                    ✕
                  </button>
                </div>
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 200 200"
                  style={{ background: '#0f172a', borderRadius: '10px', display: 'block' }}
                >
                  {renderMinimapMarkers()}
                </svg>
                <div className="minimap-legend">
                  <span>📋 Task</span>
                  <span>🔧 Companion</span>
                  <span>💬 People to Help</span>
                  <span>🎮 Mini-Game</span>
                  <span>🔵 You</span>
                </div>
              </div>
            </div>
          )}

          {leaderboardOpen && (
            <div className="minimap-expanded-overlay" onClick={() => setLeaderboardOpen(false)}>
              <div className="minimap-expanded-card" onClick={(e) => e.stopPropagation()}>
                <div className="minimap-expanded-header">
                  <h3>Live Leaderboard</h3>
                  <button className="minimap-close-btn" onClick={() => setLeaderboardOpen(false)}>
                    ✕
                  </button>
                </div>
                <LeaderboardCard playerProfile={profile} userScore={totalCoins} />
              </div>
            </div>
          )}

          <NoticeBoard
            notices={noticeBoardItems}
            isOpen={noticeBoardOpen}
            onToggle={() => setNoticeBoardOpen((v) => !v)}
            progressPct={noticeBoardProgressPct}
            pinnedTaskId={pinnedTaskId}
            onPin={(id) => setPinnedTaskId((current) => (current === id ? null : id))}
            showArrow={showNoticeBoardArrow}
          />

        </div>

        {guidePanelOpen && (
          <div className="guide-anchor-wrapper">
            <GuidePanel isOpen={guidePanelOpen} onToggle={() => setGuidePanelOpen((v) => !v)} />
          </div>
        )}

        {!anyPanelOpen && effectiveNearbyQuest && (
          <div className="interaction-toast interaction-toast--keyhint">
            Press <b>E</b> — Enter {LEVEL_CAPSTONE_QUESTS[currentLevel]?.label || effectiveNearbyQuest.label}
          </div>
        )}

        {!anyPanelOpen && !effectiveNearbyQuest && nearbyCompanionToRepair && (
          <div className="interaction-toast interaction-toast--keyhint">
            Press <b>E</b> — Unlock Companion
          </div>
        )}

        {!anyPanelOpen && !effectiveNearbyQuest && !nearbyCompanionToRepair && nearbyMiniGameSpot && !miniGameHubOpen && (
          <div className="interaction-toast interaction-toast--keyhint">
            Press <b>E</b> — Play {MINIGAME_TYPES.find((g) => g.id === nearbyMiniGameSpot)?.label || 'Mini-Game'}
          </div>
        )}

        {!anyPanelOpen && !effectiveNearbyQuest && !nearbyCompanionToRepair && !nearbyMiniGameSpot && nearbyFixedNpc && !narrative.isActive && (
          <div className="interaction-toast interaction-toast--keyhint">
            Press <b>E</b> — Talk to {nearbyFixedNpc.name}
          </div>
        )}

        {!anyPanelOpen && !effectiveNearbyQuest && !nearbyCompanionToRepair && !nearbyMiniGameSpot && !nearbyFixedNpc && nearbyNpc && !narrative.isActive && (
          <div className="interaction-toast interaction-toast--keyhint">
            Press <b>E</b> — Help {nearbyNpc.name}
          </div>
        )}

        {quizLoading && !activeQuiz && (
          <div className="interaction-toast">⏳ Generating your question...</div>
        )}

        {activeQuiz && (
          <QuestQuizModal
            quiz={activeQuiz}
            email={profile?.email}
            questOrTreasureId={activeQuestId || activeTreasureId || (activeNpcAdvisory ? `npc_advisory_${activeNpcAdvisory.name}` : null)}
            availableHints={hintScrolls}
            onUseHint={handleUseHint}
            onRetryEasy={handleRetryEasy}
            onSuccess={(rewardAmount) => {
              if (activeTreasureId) {
                setCollectedTreasureIds((prev) => new Set(prev).add(activeTreasureId))
                setBonusCoins((prev) => prev + (rewardAmount || 5))
                playRewardSound('coin')

                const rewardType = Math.random() < 0.5 ? 'streak_freezer' : 'hint_scroll'
                if (rewardType === 'streak_freezer') {
                  const newFreezerCount = addStreakFreezer(sanitizedUser, 1)
                  setStreakInfo((prev) => ({ ...prev, freezers: newFreezerCount }))
                  setSystemNotice('❄️ Treasure reward: +1 Streak Freezer!')
                } else {
                  setHintScrolls((prev) => prev + 1)
                  setSystemNotice('📜 Treasure reward: +1 Hint Scroll!')
                }
                collectTreasureOnServer(profile.email, activeTreasureId, rewardType, rewardAmount || 5)
                addBond(BOND_REWARDS.treasure)
              } else if (activeQuestId) {
                // completeQuest already credits the correct coin reward for
                // this quest via QUEST_REWARDS, AND now syncs to the server
                // itself (see useQuestState.js) — no separate call needed
                // here anymore; it used to be duplicated in both places.
                questState.completeQuest(activeQuestId)
                playSuccessSound()
                addBond(BOND_REWARDS.quest)

                const building = questState.questBuildings[activeQuestId]
                const label = questState.questLabels[activeQuestId] || activeQuestId

                if (building) {
                  setActiveEffect({
                    position: [building.render_x, 0, building.render_z],
                    label: label,
                  })
                }

                if (!hasShownFirstQuestOutcomeRef.current) {
                  hasShownFirstQuestOutcomeRef.current = true
                  companionNudge.show('quest_success')
                }
                // Note: NPC-advisory encounters never reach this modal at
                // all anymore — completeAdvisorySuccess (above, near
                // handleNpcAdvisory) handles that entirely within the
                // bottom dialogue bar. This branch only ever sees
                // activeQuestId or activeCapstone now.
              } else if (activeCapstone) {
                addBond(BOND_REWARDS.quest * 2) // capstone carries more weight
                playRewardSound('capstone')

                setLevelTaskProgress((prev) => {
                  if (prev.capstoneDone) return prev
                  // Slot 4 belongs to Riya in Level 1's fixed sequence now
                  // -- Municipality Office stays playable as bonus content
                  // (still worth its own bond/coin reward above) but no
                  // longer double-books that slot. Note this building is
                  // also gated behind level1NextRequiredStep being null
                  // (see handleCapstoneInteract), so in practice it only
                  // becomes reachable once Riya -- and therefore Level 1
                  // itself -- is already done.
                  if (currentLevel !== 1) {
                    const chainId = getTaskChainId(4)
                    if (chainId) questState.completeQuest(chainId)
                  }
                  return { ...prev, capstoneDone: true }
                })

                // Completed effect only -- no badge popup here anymore.
                // The single Level 1 badge fires at the actual level
                // 1 -> 2 transition (see the level-up effect), not at
                // capstone completion itself.

                // Reuses the same checkpoint banner + 3D particle burst as a
                // regular quest completion (below), anchored on the player
                // instead of a building — this used to be plain text only.
                setActiveEffect({
                  position: playerPos ? [playerPos.x, 0, playerPos.z] : [0, 0, 0],
                  label: LEVEL_CAPSTONE_QUESTS[currentLevel]?.label || 'Capstone',
                })
              }
              setActiveQuiz(null)
              setActiveQuestId(null)
              setActiveTreasureId(null)
              setActiveNpcAdvisory(null)
              setActiveCapstone(false)
            }}
            onFail={() => {
              if (activeQuestId && !hasShownFirstQuestOutcomeRef.current) {
                hasShownFirstQuestOutcomeRef.current = true
                companionNudge.show('quest_fail')
              }
              setActiveQuiz(null)
              setActiveQuestId(null)
              setActiveTreasureId(null)
              setActiveNpcAdvisory(null)
              setActiveCapstone(false)
            }}
            onClose={() => {
              setActiveQuiz(null)
              setActiveQuestId(null)
              setActiveTreasureId(null)
              setActiveNpcAdvisory(null)
              setActiveCapstone(false)
            }}
          />
        )}

        {drawerOpen && (
          <>
            <div
              className="drawer-backdrop"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="profile-drawer">
              <h2>{profile.name}</h2>
              <p>{profile.email}</p>
              {profile.state && profile.district && (
                <p style={{ color: '#94a3b8' }}>
                  📍 {profile.district}, {profile.state}
                </p>
              )}
              <p>
                {currentScenario === 'employee'
                  ? 'New Employee'
                  : 'College Student'}
              </p>
              <p>Coins: {totalCoins}</p>
              <p>
                Tasks: {completedCount} / {questState.chain.length}
              </p>
              <button 
                onClick={handleLogout} 
                style={{ backgroundColor: '#ef4444', color: 'white', marginTop: '10px', marginBottom: '5px' }}
              >
                Logout & Switch User
              </button>
              <button onClick={() => setDrawerOpen(false)}>Close</button>
            </aside>
          </>
        )}

        <MobileControls
          showInteract={(!!effectiveNearbyQuest || !!nearbyTreasure || nearbyCompanionToRepair || (!!nearbyMiniGameSpot && !miniGameHubOpen) || (!!nearbyFixedNpc && !narrative.isActive) || (!!nearbyNpc && !narrative.isActive)) && !activeQuiz && !anyPanelOpen}
          interactLabel={
            (effectiveNearbyQuest ? (LEVEL_CAPSTONE_QUESTS[currentLevel]?.label || effectiveNearbyQuest.label) : '') ||
            (nearbyTreasure ? 'Open Treasure Chest' : '') ||
            (nearbyCompanionToRepair ? 'Unlock Companion' : '') ||
            (nearbyMiniGameSpot ? `Play ${MINIGAME_TYPES.find((g) => g.id === nearbyMiniGameSpot)?.label || 'Mini-Game'}` : '') ||
            (nearbyFixedNpc ? `Talk to ${nearbyFixedNpc.name}` : '') ||
            (nearbyNpc ? `Help ${nearbyNpc.name}` : '')
          }
          onInteract={() => {
            if (activeQuiz) return
            if (effectiveNearbyQuest?.questId) {
              handleCapstoneInteract()
            } else if (nearbyTreasure) {
              handleOpenTreasure(nearbyTreasure)
            } else if (nearbyCompanionToRepair) {
              setCompanionPhase('repairing')
            } else if (nearbyMiniGameSpot) {
              handleMiniGameSpotInteract()
            } else if (nearbyFixedNpc) {
              handleFixedNpcInteract()
            } else if (nearbyNpc) {
              handleNpcInteract()
            }
          }}
        />

        {miniGameHubOpen && (
          <MiniGameHub
            sanitizedUser={sanitizedUser}
            forcedGameId={nearbyMiniGameSpot}
            onExit={() => setMiniGameHubOpen(false)}
            onReward={(gameId, result) => {
              setBonusCoins((prev) => prev + 10)
              playRewardSound('minigame')
              // Same checkpoint banner + 3D particle burst a quest completion
              // gets, anchored on the player — this used to be silent text only.
              setActiveEffect({
                position: playerPos ? [playerPos.x, 0, playerPos.z] : [0, 0, 0],
                label: 'Mini-Game',
              })
              addBond(BOND_REWARDS.minigame)

              // The standalone +10 above is the mini-game hub's own
              // per-win reward (unchanged) — this additionally fulfills
              // this LEVEL's "play a mini-game" task slot, once per level,
              // with its own separate (larger) QUEST_REWARDS bonus on top.
              setLevelTaskProgress((prev) => {
                // Tracks THIS specific game as done regardless of whether
                // the overall "minigameDone" slot was already satisfied
                // by an earlier game -- needed so level1NextRequiredStep
                // can tell Memory Match and Cash Flow Catch apart instead
                // of one generic "played a minigame" flag.
                const alreadyCounted = (prev.completedMinigameIds || []).includes(gameId)
                const nextCompletedMinigameIds = alreadyCounted
                  ? (prev.completedMinigameIds || [])
                  : [...(prev.completedMinigameIds || []), gameId]

                if (currentLevel === 1) {
                  // Level 1's fixed sequence gives Memory Match and Cash
                  // Flow Catch their OWN chain slots (2 and 3) instead of
                  // sharing one "any minigame" slot -- each fires its own
                  // slot only the first time THAT specific game is won.
                  const LEVEL_1_MINIGAME_SLOTS = { memory_match: 2, cash_flow_catch: 3 }
                  const slotIndex = LEVEL_1_MINIGAME_SLOTS[gameId]
                  if (!alreadyCounted && slotIndex !== undefined) {
                    const chainId = getTaskChainId(slotIndex)
                    if (chainId) questState.completeQuest(chainId)
                  }
                  const bothDone = nextCompletedMinigameIds.includes('memory_match')
                    && nextCompletedMinigameIds.includes('cash_flow_catch')
                  return { ...prev, minigameDone: bothDone, completedMinigameIds: nextCompletedMinigameIds }
                }

                if (prev.minigameDone) return { ...prev, completedMinigameIds: nextCompletedMinigameIds }
                const chainId = getTaskChainId(3)
                if (chainId) questState.completeQuest(chainId)
                return { ...prev, minigameDone: true, completedMinigameIds: nextCompletedMinigameIds }
              })
              // Completed effect only (checkpoint banner above) -- no
              // badge popup here. Level 1's only badge is the level 1 -> 2
              // transition badge.
            }}
          />
        )}
      </div>
    </div>
  )
}