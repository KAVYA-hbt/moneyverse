import { useState, useCallback, useRef } from 'react'
import { ADVISORY_SCRIPTS } from '../data/advisoryScripts.js'

let bubbleIdCounter = 0
function nextId() {
  bubbleIdCounter += 1
  return bubbleIdCounter
}

/**
 * Drives the WhatsApp-style advisory conversation redesign (see
 * moneyverse-dialogue-report.md, Part C — updated per the follow-up
 * request). Unlike useCompanionNarrative (which shows ONE line at a
 * time, replacing it on advance), this accumulates a growing MESSAGE
 * HISTORY — every NPC line, robot line, and the player's own echoed
 * choices all stay visible as the conversation builds, matching a real
 * chat log.
 *
 * State machine:
 *   greeting -> options -> confirm -> [robot_help, loops back to confirm]
 *                              | no                    | yes
 *                          options (loop)          resolving -> closing_qa -> done
 *
 * Two behavior changes from the first version:
 *  - The wrap-up insight only comes from the ROBOT if the player actually
 *    tapped the robot-help button at some point in THIS conversation.
 *    If they never asked, the same insight is voiced by the PLAYER
 *    instead (their own realization) — the robot doesn't get credit for
 *    help nobody asked it for.
 *  - The ending is a real back-and-forth: the NPC asks the player a
 *    genuine follow-up question with two real answer cards, not a bare
 *    "Continue" tap-through button.
 */
export function useAdvisoryConversation() {
  const [messages, setMessages] = useState([]) // { id, speaker: 'npc'|'player'|'robot', text }
  const [phase, setPhase] = useState('idle') // 'idle' | 'greeting' | 'confirm' | 'resolving' | 'closing_qa' | 'done'
  const [pendingChoice, setPendingChoice] = useState(null) // the option VALUE currently being confirmed
  const [resolveStep, setResolveStep] = useState(0)
  const scriptRef = useRef(null)
  const npcIdRef = useRef(null)
  const reachedFullResolutionRef = useRef(false)
  const robotConsultedRef = useRef(false) // did the player tap the robot-help icon THIS conversation?

  const pushMessage = useCallback((speaker, text) => {
    if (!text) return
    setMessages((prev) => [...prev, { id: nextId(), speaker, text }])
  }, [])

  const start = useCallback((npcId) => {
    const script = ADVISORY_SCRIPTS[npcId]
    if (!script) {
      console.warn(`[useAdvisoryConversation] No script for npc id "${npcId}"`)
      return false
    }
    // Same empty-content guard as useCompanionNarrative/useStoryNarrator —
    // refuse to open the modal on a script that has no real opening line.
    if (!script.dilemmaLine || !script.dilemmaLine.trim()) {
      console.warn(`[useAdvisoryConversation] Script "${npcId}" has no dilemmaLine, refusing to open`)
      return false
    }
    scriptRef.current = script
    npcIdRef.current = npcId
    reachedFullResolutionRef.current = false
    robotConsultedRef.current = false
    bubbleIdCounter = 0
    setMessages([{ id: nextId(), speaker: 'npc', text: script.dilemmaLine }])
    setPhase('greeting')
    setPendingChoice(null)
    setResolveStep(0)
    return true
  }, [])

  const close = useCallback(() => {
    setPhase('idle')
    setMessages([])
    setPendingChoice(null)
    setResolveStep(0)
    scriptRef.current = null
    npcIdRef.current = null
    robotConsultedRef.current = false
  }, [])

  // Player picks one of the two opening options.
  const selectOption = useCallback((value, label) => {
    const script = scriptRef.current
    if (!script) return
    pushMessage('player', label)

    const hasConfirmArc = !!script.confirmQuestion?.[value]
    if (hasConfirmArc) {
      setPendingChoice(value)
      pushMessage('npc', script.confirmQuestion[value])
      setPhase('confirm')
    } else {
      // No written confirm arc for this choice (e.g. "spend now") — a
      // short, non-judgmental close, per spec (dispensing entirely with
      // a graded/wrong framing at this stage).
      pushMessage('npc', script.spendDeclineLine)
      pushMessage('player', `No problem! See you later, ${script.npcName}.`)
      setPhase('done')
    }
  }, [pushMessage])

  // "Yes, do it" / "No, let me think" during the confirm step.
  const confirmChoice = useCallback((confirmed) => {
    const script = scriptRef.current
    const value = pendingChoice
    if (!script || !value) return

    if (confirmed) {
      pushMessage('player', 'Yes, do it.')
      setPhase('resolving')
      setResolveStep(0)
    } else {
      pushMessage('player', 'No, let me think again.')
      // Loops back to the option cards, not a hard reset — the player
      // can pick the same option again or the other one, no penalty.
      setPendingChoice(null)
      setPhase('greeting')
    }
  }, [pendingChoice, pushMessage])

  // Robot icon tap during confirm — always available, not just on
  // hesitation, per spec. The robot's line always ends by asking the
  // player something back (see advisoryScripts.js), so this is a real
  // exchange, not a flat statement — and tapping it here is what
  // unlocks the robot's voice at the resolution stage below.
  const requestRobotHelp = useCallback(() => {
    const script = scriptRef.current
    const value = pendingChoice
    if (!script || !value) return
    const line = script.robotHelpLine?.[value]
    if (line) {
      pushMessage('robot', line)
      robotConsultedRef.current = true
    }
    // Stays in 'confirm' phase — the Yes/No cards simply remain visible
    // the whole time (robot icon doesn't hide them), so there's nothing
    // further to change here beyond adding the robot's line.
  }, [pendingChoice, pushMessage])

  // Advances through the resolution sequence one beat at a time: the
  // time-skip NPC lines, then a closing insight (robot's, ONLY if the
  // player actually consulted it this conversation — otherwise the
  // player voices the same realization themselves), then the NPC's
  // thanks, then the player's own warm close — tap-to-advance, matching
  // the convention every other dialogue beat in this game uses.
  //
  // Deliberately ends here, on the NPC's own thanks + the player's
  // goodbye — it does NOT ask the player a further question on the
  // NPC's behalf. A short, natural NPC exchange shouldn't end on an
  // out-of-place quiz-style question; any follow-up self-report (e.g.
  // "do you save money yourself?") belongs to the ROBOT COMPANION, as
  // its own separate beat once this chat closes — see fireSavingsHabitCheckin
  // in GamePage.jsx — not bolted onto the NPC's voice.
  const advanceResolution = useCallback(() => {
    const script = scriptRef.current
    const value = pendingChoice
    if (!script || !value) return

    const resolutionLines = script.resolutionLine?.[value] || []
    const insightStep = robotConsultedRef.current
      ? { speaker: 'robot', text: script.robotResolutionLine?.[value] }
      : { speaker: 'player', text: script.userInsightLine?.[value] }

    const steps = [
      ...resolutionLines.map((text) => ({ speaker: 'npc', text })),
      insightStep,
      { speaker: 'npc', text: script.npcThanksLine?.[value] },
      { speaker: 'player', text: `No problem! See you later, ${script.npcName}.` },
    ].filter((step) => !!step.text)

    if (resolveStep < steps.length) {
      pushMessage(steps[resolveStep].speaker, steps[resolveStep].text)
      setResolveStep((s) => s + 1)
    }

    if (resolveStep + 1 >= steps.length) {
      reachedFullResolutionRef.current = true
      setPhase('done')
    }
  }, [pendingChoice, resolveStep, pushMessage])

  const script = scriptRef.current

  // Actual step count for the current resolution sequence, derived from
  // the script rather than guessed — accounts for whichever insight
  // line (robot's or the player's own) will actually be shown.
  const totalResolveSteps = (() => {
    if (!script || !pendingChoice) return 0
    const resolutionLines = script.resolutionLine?.[pendingChoice] || []
    const insightLine = robotConsultedRef.current
      ? script.robotResolutionLine?.[pendingChoice]
      : script.userInsightLine?.[pendingChoice]
    return [
      ...resolutionLines,
      insightLine,
      script.npcThanksLine?.[pendingChoice],
      'closing-line-always-present', // the player's own goodbye, always shown
    ].filter(Boolean).length
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
    // What choice cards (if any) should render right now — kept here
    // rather than duplicated in the component, so the UI stays a pure
    // function of this hook's state.
    currentOptions: phase === 'greeting' ? script?.options ?? null : null,
    showConfirmCards: phase === 'confirm',
    showResolveContinue: phase === 'resolving' && resolveStep < totalResolveSteps,
    start,
    close,
    selectOption,
    confirmChoice,
    requestRobotHelp,
    advanceResolution,
  }
}