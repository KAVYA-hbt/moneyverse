import { useState, useCallback, useRef } from 'react'
import { NARRATOR_BEATS } from '../data/narratorStory.js'

function storageKey(sanitizedUser) {
  return `sbi_questcraft_narrator_seen_${sanitizedUser}`
}

function getSeenBeats(sanitizedUser) {
  try {
    const saved = localStorage.getItem(storageKey(sanitizedUser))
    return saved ? new Set(JSON.parse(saved)) : new Set()
  } catch {
    return new Set()
  }
}

function markBeatSeen(sanitizedUser, beatId) {
  try {
    const seen = getSeenBeats(sanitizedUser)
    seen.add(beatId)
    localStorage.setItem(storageKey(sanitizedUser), JSON.stringify([...seen]))
  } catch {
    // ignore storage errors
  }
}

// A beat's `lines` can be a plain array or a function of context (e.g.
// personalizing with the player's avatar name) — resolve either shape
// the same way useCompanionNarrative does, so both hooks behave
// consistently.
function resolveLines(beatId, ctx) {
  const b = NARRATOR_BEATS[beatId]
  if (!b) return []
  return typeof b.lines === 'function' ? (b.lines(ctx) || []) : (b.lines || [])
}

// Refuse to queue/open a beat whose lines resolve empty — same class of
// bug already fixed in useCompanionNarrative.js (isActive there was
// derived from the beat id alone, with no check that it had real
// content, so a bad/partial beat opened a blank box with no way to
// dismiss it). This hook had the identical gap; fireResumeNudge() routes
// through here, not useCompanionNarrative, so this was the more likely
// actual source of the reported blank companion-nudge box.
function hasContent(beatId, ctx) {
  const first = resolveLines(beatId, ctx)[0]
  return typeof first === 'string' && first.trim() !== ''
}

/**
 * Separate from useCompanionNarrative on purpose — the narrator explains
 * the STORY (once per beat, ever), the companion explains QUESTS (can
 * repeat, has choices). Different job, different voice, different UI.
 *
 * Queued: if playOnce() is called multiple times in the same tick (e.g.
 * intro + level_1_start firing together on first load), each unseen beat
 * plays in full, one after another — none of them get silently dropped by
 * a later call overwriting an earlier one's state update. Each queue
 * entry carries its own context so, e.g., a personalized nudge queued
 * behind an unrelated story beat still renders with the right name.
 */
export function useStoryNarrator(sanitizedUser) {
  const [activeBeatId, setActiveBeatId] = useState(null)
  const [activeCtx, setActiveCtx] = useState({})
  const [lineIndex, setLineIndex] = useState(0)
  const queueRef = useRef([]) // [{ beatId, ctx }]
  const repeatableBeatIdsRef = useRef(new Set())

  const lines = activeBeatId ? resolveLines(activeBeatId, activeCtx) : []
  const hasMoreLines = lineIndex < lines.length - 1

  const startNextInQueue = useCallback(() => {
    const next = queueRef.current.shift()
    if (next) {
      setActiveBeatId(next.beatId)
      setActiveCtx(next.ctx || {})
      setLineIndex(0)
    } else {
      setActiveBeatId(null)
      setActiveCtx({})
      setLineIndex(0)
    }
  }, [])

  const enqueue = useCallback((beatId, ctx) => {
    setActiveBeatId((current) => {
      if (current === null) {
        setActiveCtx(ctx || {})
        setLineIndex(0)
        return beatId
      }
      queueRef.current.push({ beatId, ctx })
      return current
    })
  }, [])

  /** Plays a beat only if this player has never seen it before. Queues
   *  behind whatever's currently showing (or pending) rather than
   *  interrupting it. Does NOT mark it seen yet — that only happens once
   *  the player actually finishes reading it (see advance() below), so a
   *  page refresh mid-beat shows it again instead of silently losing it
   *  forever. */
  const playOnce = useCallback((beatId, ctx = {}) => {
    if (!NARRATOR_BEATS[beatId] || !hasContent(beatId, ctx)) {
      console.warn(`[useStoryNarrator] Refusing empty/unknown beat: "${beatId}"`)
      return
    }
    const seen = getSeenBeats(sanitizedUser)
    if (seen.has(beatId)) return
    if (queueRef.current.some((q) => q.beatId === beatId)) return // already queued this tick
    if (activeBeatId === beatId) return // already the one currently showing

    enqueue(beatId, ctx)
  }, [sanitizedUser, activeBeatId, enqueue])

  /** Same queueing/display machinery as playOnce, but deliberately skips
   *  the "already seen" check entirely — for beats meant to repeat (e.g.
   *  "your companion's still waiting"), reusing the Narrator's exact
   *  visual voice instead of duplicating it elsewhere. */
  const playRepeatable = useCallback((beatId, ctx = {}) => {
    if (!NARRATOR_BEATS[beatId] || !hasContent(beatId, ctx)) {
      console.warn(`[useStoryNarrator] Refusing empty/unknown beat: "${beatId}"`)
      return
    }
    repeatableBeatIdsRef.current.add(beatId)
    if (queueRef.current.some((q) => q.beatId === beatId)) return
    if (activeBeatId === beatId) return

    enqueue(beatId, ctx)
  }, [activeBeatId, enqueue])

  const advance = useCallback(() => {
    setLineIndex((i) => {
      if (i < lines.length - 1) return i + 1
      // Finishing the LAST line of this beat — mark it seen NOW, not at
      // trigger time (so a refresh mid-beat shows it again), and only for
      // beats that came through playOnce — a repeatable beat should never
      // get permanently marked, or it'd silently stop working the next
      // time playRepeatable is called for it.
      if (activeBeatId && !repeatableBeatIdsRef.current.has(activeBeatId)) {
        markBeatSeen(sanitizedUser, activeBeatId)
      }
      queueMicrotask(startNextInQueue)
      return i
    })
  }, [lines.length, startNextInQueue, activeBeatId, sanitizedUser])

  return {
    isActive: !!activeBeatId,
    currentLine: lines[lineIndex] ?? '',
    hasMoreLines,
    playOnce,
    playRepeatable,
    advance,
  }
}