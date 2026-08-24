import { useState, useCallback, useRef } from 'react'
import { getNarratorBeat } from '../data/narratorStory.js'

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

/**
 * Separate from useCompanionNarrative on purpose — the narrator explains
 * the STORY (once per beat, ever), the companion explains QUESTS (can
 * repeat, has choices). Different job, different voice, different UI.
 *
 * Queued: if playOnce() is called multiple times in the same tick (e.g.
 * intro + level_1_start firing together on first load), each unseen beat
 * plays in full, one after another — none of them get silently dropped by
 * a later call overwriting an earlier one's state update.
 */
export function useStoryNarrator(sanitizedUser, language = 'en') {
  const [activeBeatId, setActiveBeatId] = useState(null)
  const [lineIndex, setLineIndex] = useState(0)
  const queueRef = useRef([])
  const repeatableBeatIdsRef = useRef(new Set())

  const beat = activeBeatId ? getNarratorBeat(activeBeatId, language) : null
  const lines = beat?.lines ?? []
  const hasMoreLines = lineIndex < lines.length - 1

  const startNextInQueue = useCallback(() => {
    const next = queueRef.current.shift()
    if (next) {
      setActiveBeatId(next)
      setLineIndex(0)
    } else {
      setActiveBeatId(null)
      setLineIndex(0)
    }
  }, [])

  /** Plays a beat only if this player has never seen it before. Queues
   *  behind whatever's currently showing (or pending) rather than
   *  interrupting it. Does NOT mark it seen yet — that only happens once
   *  the player actually finishes reading it (see advance() below), so a
   *  page refresh mid-beat shows it again instead of silently losing it
   *  forever. */
  const playOnce = useCallback((beatId) => {
    const targetBeat = getNarratorBeat(beatId, language)
    if (!targetBeat) {
      console.warn(`[useStoryNarrator] Unknown beat id: "${beatId}"`)
      return
    }
    // Same empty-line guard as useCompanionNarrative's play() -- refuses
    // to open the box for a beat whose first line is missing/blank,
    // which is exactly the "blank dialogue box" bug reported tonight.
    const firstLine = targetBeat.lines?.[0]
    if (!firstLine || (typeof firstLine === 'string' && firstLine.trim() === '')) {
      console.warn(`[useStoryNarrator] Refused to open an empty beat:`, beatId)
      return
    }
    const seen = getSeenBeats(sanitizedUser)
    if (seen.has(beatId)) return
    if (queueRef.current.includes(beatId)) return // already queued this tick
    if (activeBeatId === beatId) return // already the one currently showing

    setActiveBeatId((current) => {
      if (current === null) {
        setLineIndex(0)
        return beatId
      }
      queueRef.current.push(beatId)
      return current
    })
  }, [sanitizedUser, activeBeatId, language])

  /** Same queueing/display machinery as playOnce, but deliberately skips
   *  the "already seen" check entirely — for beats meant to repeat (e.g.
   *  "your companion's still waiting"), reusing the Narrator's exact
   *  visual voice instead of duplicating it elsewhere. */
  const playRepeatable = useCallback((beatId) => {
    const targetBeat = getNarratorBeat(beatId, language)
    if (!targetBeat) {
      console.warn(`[useStoryNarrator] Unknown beat id: "${beatId}"`)
      return
    }
    const firstLine = targetBeat.lines?.[0]
    if (!firstLine || (typeof firstLine === 'string' && firstLine.trim() === '')) {
      console.warn(`[useStoryNarrator] Refused to open an empty beat:`, beatId)
      return
    }
    repeatableBeatIdsRef.current.add(beatId)
    if (queueRef.current.includes(beatId)) return
    if (activeBeatId === beatId) return

    setActiveBeatId((current) => {
      if (current === null) {
        setLineIndex(0)
        return beatId
      }
      queueRef.current.push(beatId)
      return current
    })
  }, [sanitizedUser, activeBeatId, language])

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