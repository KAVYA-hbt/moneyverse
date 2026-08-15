import { useState, useCallback, useRef, useEffect } from 'react'
import { DIALOGUE_BEATS } from '../data/companionDialogue.js'

const HOLD_MS = 3400 // how long each line stays up before advancing/fading

/**
 * A companion "nudge" is guidance the player should be able to just read
 * and keep moving through -- "head to Arjun, he needs help", "follow the
 * arrow", "nice work, you're solid on savings" -- NOT a conversation that
 * needs a decision. Previously these routed through useCompanionNarrative
 * and popped the full-width CompanionDialogueModal bar, which blocked the
 * screen and demanded a tap to dismiss even for a one-line FYI. That read
 * as the companion "disturbing" the player mid-task instead of quietly
 * guiding them.
 *
 * This hook instead drives a small floating bubble (rendered above the
 * companion's own 3D position -- see CompanionWorldModel's `nudgeText`
 * prop) that appears on its own, steps through multi-line beats
 * automatically, and fades itself out. No tap, no options, nothing to
 * block movement or another interaction with.
 *
 * Only beats WITHOUT `options` should ever be routed here -- anything
 * that needs a real decision (NPC greetings, the mayor ceremony, product
 * funnel check-ins) still belongs on the full CompanionDialogueModal.
 */
export function useCompanionNudge() {
  const [lines, setLines] = useState([])
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef(null)

  const show = useCallback((beatOrId, ctx = {}) => {
    const beat = typeof beatOrId === 'string' ? DIALOGUE_BEATS[beatOrId] : beatOrId
    if (!beat) {
      console.warn(`[useCompanionNudge] Unknown beat: "${beatOrId}"`)
      return
    }
    if (beat.options) {
      console.warn(`[useCompanionNudge] "${beatOrId}" has options -- route it through useCompanionNarrative instead, not a nudge.`)
      return
    }

    const resolvedLines = typeof beat.lines === 'function' ? beat.lines(ctx) : beat.lines
    // Each individual entry can ALSO be a function (see companionDialogue.js's
    // documented shape) -- e.g. ["static string", (ctx) => `dynamic ${ctx.x}`].
    // Resolving only ever checked whether the WHOLE `lines` value was a
    // function, so a per-line function slipped through as-is and crashed
    // here on `.trim()` since functions don't have that method.
    const cleanLines = (resolvedLines || [])
      .map((line) => (typeof line === 'function' ? line(ctx) : line))
      .filter((line) => typeof line === 'string' && line.trim() !== '')
    if (cleanLines.length === 0) {
      console.warn(`[useCompanionNudge] Refused to show an empty nudge:`, beatOrId)
      return
    }

    clearTimeout(timeoutRef.current)
    setLines(cleanLines)
    setIndex(0)
    setVisible(true)
  }, [])

  const dismiss = useCallback(() => {
    clearTimeout(timeoutRef.current)
    setVisible(false)
  }, [])

  // Auto-advances through multi-line beats, then auto-fades on the last
  // line -- entirely hands-off, exactly the "guide with words, don't
  // block the task" behavior that was asked for.
  useEffect(() => {
    if (!visible) return undefined
    const isLastLine = index >= lines.length - 1

    timeoutRef.current = setTimeout(() => {
      if (isLastLine) {
        setVisible(false)
      } else {
        setIndex((i) => i + 1)
      }
    }, HOLD_MS)

    return () => clearTimeout(timeoutRef.current)
  }, [visible, index, lines])

  return {
    isVisible: visible,
    currentLine: lines[index] ?? '',
    show,
    dismiss,
  }
}