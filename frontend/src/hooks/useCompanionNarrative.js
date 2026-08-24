import { useState, useCallback, useRef } from 'react'
import { getDialogueBeat } from '../data/companionDialogue.js'

// A single line in a beat's `lines` array can itself be a function (not
// just the whole `lines` value) -- see companionDialogue.js's documented
// shape and e.g. `first_quest_approach`. Every place that reads a line out
// of a resolved array needs to run it through this, or a raw function ends
// up handed to `.trim()` (crash) or straight into JSX as `{currentLine}`
// (React's "functions are not valid as a child" error).
const resolveLine = (line, ctx) => (typeof line === 'function' ? line(ctx) : line)

/**
 * Drives one dialogue "beat" at a time. A beat is a small sequence of
 * lines (tap to advance), optionally ending in clickable-only choice
 * buttons — never a free-text field, per the project's core UI rule.
 *
 * Usage:
 *   const narrative = useCompanionNarrative()
 *   narrative.play('quest_success')                       // no dynamic values needed
 *   narrative.play('first_quest_approach', { questLabel }) // with context
 *   narrative.play('product_funnel_checkin', {}, (value) => { ... }) // with a choice callback
 *
 *   // A beat can also be built on the fly — pass a beat OBJECT instead of
 *   // a string id — for content that isn't known ahead of time (e.g. an
 *   // NPC's options fetched from the backend at runtime):
 *   narrative.play({ speaker: 'npc', lines: [...], options: [...] }, {}, (value) => { ... })
 *
 *   // The callback also fires (with no argument) when a beat WITHOUT
 *   // options is dismissed, so plain lines can be chained into whatever
 *   // comes next — this is how a multi-turn conversation is built up
 *   // from several play() calls in a row instead of one big static beat.
 *   narrative.play({ speaker: 'npc', lines: ["One sec..."] }, {}, () => { narrative.play(...) })
 *
 * The active line/animation/options are read by CompanionDialogueModal.
 */
export function useCompanionNarrative(language = 'en') {
  const [activeBeat, setActiveBeat] = useState(null) // resolved beat object, or null
  const [context, setContext] = useState({})
  const [lineIndex, setLineIndex] = useState(0)
  const [onChoice, setOnChoice] = useState(null) // (value?: string) => void

  // Tracks whether play() ran synchronously *during* the current
  // advance()/selectOption() call — i.e. the completion callback chained
  // straight into the next turn. Needed because close()'s setActiveBeat(null)
  // would otherwise land in the same batch as play()'s setActiveBeat(newBeat)
  // and win (it runs later in the same synchronous call), silently wiping
  // out every chained turn the instant it appeared.
  const playCalledDuringCallbackRef = useRef(false)

  const play = useCallback((beatOrId, ctx = {}, choiceCallback = null) => {
    const resolvedBeat = typeof beatOrId === 'string' ? getDialogueBeat(beatOrId, language) : beatOrId
    if (!resolvedBeat) {
      console.warn(`[useCompanionNarrative] Unknown beat: "${beatOrId}"`)
      return
    }

    // Guards against opening an empty dialogue box — a stale/failed async
    // response (e.g. an NPC-advisory backend call racing a navigation or
    // a refresh) could otherwise hand play() a beat whose `lines` resolve
    // to an empty array or a blank first string, and the modal would pop
    // open showing nothing at all with no way to dismiss it cleanly.
    const firstLine = resolveLine(
      typeof resolvedBeat.lines === 'function' ? resolvedBeat.lines(ctx)?.[0] : resolvedBeat.lines?.[0],
      ctx,
    )
    if (!firstLine || (typeof firstLine === 'string' && firstLine.trim() === '')) {
      console.warn(`[useCompanionNarrative] Refused to open an empty beat:`, beatOrId)
      return
    }

    playCalledDuringCallbackRef.current = true
    setActiveBeat(resolvedBeat)
    setContext(ctx)
    setLineIndex(0)
    setOnChoice(() => choiceCallback)
  }, [language])

  const close = useCallback(() => {
    setActiveBeat(null)
    setContext({})
    setLineIndex(0)
    setOnChoice(null)
  }, [])

  const beat = activeBeat
  const resolvedLines = beat
    ? (typeof beat.lines === 'function' ? beat.lines(context) : beat.lines || []).map((line) => resolveLine(line, context))
    : []
  const isLastLine = lineIndex === resolvedLines.length - 1
  const showOptions = isLastLine && !!beat?.options

  const advance = useCallback(() => {
    if (!beat) return
    if (lineIndex < resolvedLines.length - 1) {
      setLineIndex((i) => i + 1)
    } else if (!beat.options) {
      // No choices on the final line — fire the completion callback (if
      // any was given) before closing, so callers can chain into the
      // next turn of a conversation. Only actually close if that
      // callback didn't already start a new beat.
      playCalledDuringCallbackRef.current = false
      onChoice?.()
      if (!playCalledDuringCallbackRef.current) {
        close()
      }
    }
    // If there ARE options on the final line, advance() does nothing
    // further; selectOption() below handles closing.
  }, [beat, lineIndex, resolvedLines.length, onChoice, close])

  const selectOption = useCallback((value) => {
    playCalledDuringCallbackRef.current = false
    onChoice?.(value)
    if (!playCalledDuringCallbackRef.current) {
      close()
    }
  }, [onChoice, close])

  return {
    isActive: !!activeBeat,
    speaker: beat?.speaker ?? null,
    currentLine: resolvedLines[lineIndex] ?? '',
    currentAnimation: beat?.animation ?? null,
    options: showOptions ? beat.options : null,
    hasMoreLines: beat ? lineIndex < resolvedLines.length - 1 : false,
    play,
    advance,
    selectOption,
    close,
  }
}