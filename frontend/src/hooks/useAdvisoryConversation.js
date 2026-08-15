import { useState, useCallback, useRef } from 'react'
import { ADVISORY_SCRIPTS } from '../data/advisoryScripts.js'

let bubbleIdCounter = 0
function nextId() {
  bubbleIdCounter += 1
  return bubbleIdCounter
}

// Fallback reaction chips for any resolution beat that doesn't have
// hand-written ones in the script data -- keeps the engine safe even if a
// future script forgets to fill this in, without ever falling back to a
// bare "Continue" button.
const DEFAULT_REACTION_OPTIONS = [
  { label: 'Oh no, what happened?', value: 'react_default_ask' },
  { label: 'Go on...', value: 'react_default_go_on' },
]

/**
 * Drives the WhatsApp-style advisory conversation. The chat log itself
 * only ever contains 'npc' and 'player' entries -- robot commentary and
 * the concluding takeaway never get pushed into `messages` at all. They
 * live in `robotHintText`/`robotHintVisible` and `takeawayText`/
 * `takeawayVisible` instead, rendered as small floating panels OUTSIDE
 * the chat box (see AdvisoryConversationModal.jsx). Two real problems
 * this fixes:
 *   1. The robot used to "butt into" the NPC/player back-and-forth as
 *      its own chat bubbles.
 *   2. The resolution beats used to be stepped through with a plain grey
 *      "Continue" button, and the closing lesson was itself one more
 *      bubble the player had to tap past -- both read as filler rather
 *      than a real conversation. Now every single beat (including each
 *      resolution line) waits on an actual two-option tap-choice, and
 *      the lesson simply appears alongside the next real choice instead
 *      of costing the player a turn of its own.
 *
 * State machine:
 *   greeting -> options -> confirm -> resolving (each resolution line is
 *   followed by a real 2-option reaction, never a bare Continue) ->
 *   mid_resolution (takeaway card fades in here, non-blocking) ->
 *   goodbye -> done
 */
export function useAdvisoryConversation() {
  const [messages, setMessages] = useState([]) // { id, speaker: 'npc'|'player', text }
  const [phase, setPhase] = useState('idle') // 'idle' | 'greeting' | 'confirm' | 'resolving' | 'mid_resolution' | 'goodbye' | 'done'
  const [pendingChoice, setPendingChoice] = useState(null) // the option VALUE currently being confirmed
  const [resolveStep, setResolveStep] = useState(0) // index of the resolution line most recently shown
  const [robotHintText, setRobotHintText] = useState(null)
  const [robotHintVisible, setRobotHintVisible] = useState(false)
  const [takeawayVisible, setTakeawayVisible] = useState(false)
  const scriptRef = useRef(null)
  const npcIdRef = useRef(null)
  const reachedFullResolutionRef = useRef(false)

  // Behavioral-signal tracking -- feeds AdvisoryChoice on the backend
  // (see main.py's log_advisory_choice / models.py's AdvisoryChoice).
  // Deliberately refs, not state: none of this needs to trigger a
  // re-render, it just needs to be readable once the conversation ends.
  const startedAtRef = useRef(null)
  const firstChoiceAtRef = useRef(null)   // timestamp of the FIRST selectOption tap (initial deliberation speed)
  const finalChoiceValueRef = useRef(null) // the option that was actually confirmed and carried through
  const reversedCountRef = useRef(0)       // times the player backed out at the confirm step
  const robotHintUsedRef = useRef(false)   // asked the companion for help at any point this conversation

  const pushMessage = useCallback((speaker, text) => {
    if (!text) return
    setMessages((prev) => [...prev, { id: nextId(), speaker, text }])
  }, [])

  const resetState = useCallback(() => {
    setPendingChoice(null)
    setResolveStep(0)
    setRobotHintText(null)
    setRobotHintVisible(false)
    setTakeawayVisible(false)
  }, [])

  const start = useCallback((npcId) => {
    const script = ADVISORY_SCRIPTS[npcId]
    if (!script) {
      console.warn(`[useAdvisoryConversation] No script for npc id "${npcId}"`)
      return false
    }
    if (!script.dilemmaLine || !script.dilemmaLine.trim()) {
      console.warn(`[useAdvisoryConversation] Script "${npcId}" has no dilemmaLine, refusing to open`)
      return false
    }
    scriptRef.current = script
    npcIdRef.current = npcId
    reachedFullResolutionRef.current = false
    startedAtRef.current = Date.now()
    firstChoiceAtRef.current = null
    finalChoiceValueRef.current = null
    reversedCountRef.current = 0
    robotHintUsedRef.current = false
    bubbleIdCounter = 0
    setMessages([{ id: nextId(), speaker: 'npc', text: script.dilemmaLine }])
    setPhase('greeting')
    resetState()
    return true
  }, [resetState])

  const close = useCallback(() => {
    setPhase('idle')
    setMessages([])
    resetState()
    scriptRef.current = null
    npcIdRef.current = null
  }, [resetState])

  // Player picks one of the three opening options.
  const selectOption = useCallback((value, label) => {
    const script = scriptRef.current
    if (!script) return
    if (firstChoiceAtRef.current === null) firstChoiceAtRef.current = Date.now()
    pushMessage('player', label)
    setRobotHintVisible(false)

    const hasConfirmArc = !!script.confirmQuestion?.[value]
    if (hasConfirmArc) {
      setPendingChoice(value)
      pushMessage('npc', script.confirmQuestion[value])
      setPhase('confirm')
    } else {
      finalChoiceValueRef.current = value
      pushMessage('npc', script.spendDeclineLine)
      pushMessage('player', `No problem! See you later, ${script.npcName}.`)
      setPhase('done')
    }
  }, [pushMessage])

  // Kicks off the resolution narrative right after "Yes, do it." Shows the
  // first resolution line immediately (it's the natural continuation of
  // the choice the player JUST made), then either waits for a real
  // reaction tap before the next line, or -- if there's only one line, or
  // none at all -- skips straight to the real mid-resolution options with
  // no filler tap in between.
  const beginResolution = useCallback((script, value) => {
    const lines = script.resolutionLine?.[value] || []

    if (lines.length === 0) {
      setTakeawayVisible(true)
      setPhase('mid_resolution')
      return
    }

    pushMessage('npc', lines[0])
    setResolveStep(0)

    if (lines.length === 1) {
      setTakeawayVisible(true)
      setPhase('mid_resolution')
    } else {
      setPhase('resolving')
    }
  }, [pushMessage])

  // "Yes, do it" / "No, let me think" during the confirm step. The "no"
  // path loops cleanly back to the option cards -- pendingChoice clears,
  // phase returns to 'greeting' (which is what makes currentOptions
  // re-render below), and the robot hint panel closes since it was
  // scoped to the choice being reconsidered.
  const confirmChoice = useCallback((confirmed) => {
    const script = scriptRef.current
    const value = pendingChoice
    if (!script || !value) return

    setRobotHintVisible(false)

    if (confirmed) {
      finalChoiceValueRef.current = value
      pushMessage('player', 'Yes, do it.')
      beginResolution(script, value)
    } else {
      reversedCountRef.current += 1
      pushMessage('player', 'No, let me think again.')
      setPendingChoice(null)
      setPhase('greeting')
    }
  }, [pendingChoice, pushMessage, beginResolution])

  // Shows the contextual robot line in the EXTERNAL hint panel -- never
  // pushed into the chat log. Available during 'confirm' (shows
  // robotHelpLine) and during 'resolving' onward (shows
  // robotResolutionLine) via the same icon.
  const requestRobotHelp = useCallback(() => {
    const script = scriptRef.current
    const value = pendingChoice
    if (!script || !value) return

    const line = phase === 'confirm'
      ? script.robotHelpLine?.[value]
      : script.robotResolutionLine?.[value]

    if (line) {
      robotHintUsedRef.current = true
      setRobotHintText(line)
      setRobotHintVisible(true)
    }
  }, [pendingChoice, phase])

  const dismissRobotHint = useCallback(() => {
    setRobotHintVisible(false)
  }, [])

  // Replaces the old "Continue" button. Every resolution line beyond the
  // first is unlocked by an actual 2-option reaction chip -- picking
  // either one pushes the player's chosen reaction as a real chat bubble,
  // then reveals the next NPC line. Once the LAST resolution line has
  // been shown, the takeaway card fades in beside the conversation (not
  // into it) and the real mid-resolution choices become available
  // immediately, with no extra tap wasted on the lesson itself.
  const selectResolutionReaction = useCallback((value, label) => {
    const script = scriptRef.current
    const pending = pendingChoice
    if (!script || !pending) return

    pushMessage('player', label)

    const lines = script.resolutionLine?.[pending] || []
    const nextIndex = resolveStep + 1
    if (nextIndex >= lines.length) return // safety guard, shouldn't happen

    pushMessage('npc', lines[nextIndex])
    setResolveStep(nextIndex)

    if (nextIndex === lines.length - 1) {
      setTakeawayVisible(true)
      setPhase('mid_resolution')
    }
  }, [pendingChoice, resolveStep, pushMessage])

  const selectMidResolutionOption = useCallback((value, label) => {
    const script = scriptRef.current
    if (!script || !pendingChoice) return
    pushMessage('player', label)

    const postLine = script.postResolutionLine?.[pendingChoice]
    if (postLine) {
      pushMessage('npc', postLine)
    }

    setPhase('goodbye')
  }, [pendingChoice, pushMessage])

  const selectGoodbyeOption = useCallback((value, label) => {
    const script = scriptRef.current
    if (!script) return
    pushMessage('player', label)
    reachedFullResolutionRef.current = true
    setTakeawayVisible(false)
    setPhase('done')
  }, [pushMessage])

  const script = scriptRef.current

  // Which real 2-option reaction chips to show right now, mid-resolution.
  // Falls back to a generic pair rather than ever showing a bare Continue.
  const resolutionReactionOptions = (() => {
    if (phase !== 'resolving' || !script || !pendingChoice) return null
    const custom = script.resolveReactionOptions?.[pendingChoice]?.[resolveStep]
    return custom && custom.length > 0 ? custom : DEFAULT_REACTION_OPTIONS
  })()

  // Whether the robot-help icon has anything to actually show right now
  // -- hides the icon entirely rather than showing a dead button when
  // this particular path/phase has no hint written for it.
  const robotHelpAvailable = (() => {
    if (!script || !pendingChoice) return false
    if (phase === 'confirm') return !!script.robotHelpLine?.[pendingChoice]
    if (phase === 'resolving' || phase === 'mid_resolution' || phase === 'goodbye') {
      return !!script.robotResolutionLine?.[pendingChoice]
    }
    return false
  })()

  return {
    isActive: phase !== 'idle',
    phase,
    messages,
    npcId: npcIdRef.current,
    npcName: script?.npcName ?? null,
    signal: script?.signal ?? null,
    funnelLine: script?.funnelLine ?? null,
    reachedFullResolution: reachedFullResolutionRef.current,
    // Raw behavioral signal for this conversation -- only meaningful once
    // phase is 'done'. Read once, at completion; not meant to be watched
    // mid-conversation (values keep changing until the very end).
    analytics: {
      choiceValue: finalChoiceValueRef.current,
      decisionTimeMs: firstChoiceAtRef.current && startedAtRef.current
        ? firstChoiceAtRef.current - startedAtRef.current
        : null,
      totalConversationMs: startedAtRef.current ? Date.now() - startedAtRef.current : null,
      reversedCount: reversedCountRef.current,
      robotHintUsed: robotHintUsedRef.current,
    },
    currentOptions: phase === 'greeting' ? script?.options ?? null : null,
    showConfirmCards: phase === 'confirm',
    resolutionReactionOptions,
    midResolutionOptions: phase === 'mid_resolution' ? script?.midResolutionOptions?.[pendingChoice] ?? null : null,
    goodbyeOptions: phase === 'goodbye' ? script?.goodbyeOptions ?? null : null,
    robotHelpAvailable,
    robotHintText,
    robotHintVisible,
    takeawayText: script?.takeawayLine ?? null,
    takeawayVisible,
    start,
    close,
    selectOption,
    confirmChoice,
    requestRobotHelp,
    dismissRobotHint,
    selectResolutionReaction,
    selectMidResolutionOption,
    selectGoodbyeOption,
  }
}