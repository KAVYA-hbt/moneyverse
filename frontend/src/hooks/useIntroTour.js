import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getIntroTourSteps } from '../data/introTourSteps.js'

const TYPE_SPEED_MS = 18

function storageKey(sanitizedUser) {
  return `sbi_questcraft_introtour_done_${sanitizedUser}`
}

function hasCompletedTour(sanitizedUser) {
  try {
    return localStorage.getItem(storageKey(sanitizedUser)) === 'true'
  } catch {
    return false
  }
}

function markTourComplete(sanitizedUser) {
  try {
    localStorage.setItem(storageKey(sanitizedUser), 'true')
  } catch {
    // ignore storage errors
  }
}

export function useIntroTour(sanitizedUser, language = 'en') {
  const [isActive, setIsActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [visibleChars, setVisibleChars] = useState(0)
  const typingIntervalRef = useRef(null)

  const INTRO_TOUR_STEPS = useMemo(() => getIntroTourSteps(language), [language])
  const currentStep = INTRO_TOUR_STEPS[stepIndex]
  const fullText = currentStep?.text ?? ''
  const isTyping = visibleChars < fullText.length

  const startTyping = useCallback((text) => {
    clearInterval(typingIntervalRef.current)
    setVisibleChars(0)
    let i = 0
    typingIntervalRef.current = setInterval(() => {
      i += 1
      setVisibleChars(i)
      if (i >= text.length) clearInterval(typingIntervalRef.current)
    }, TYPE_SPEED_MS)
  }, [])

  useEffect(() => {
    if (!isActive || !currentStep) return
    startTyping(currentStep.text)
    return () => clearInterval(typingIntervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, stepIndex])

  useEffect(() => () => clearInterval(typingIntervalRef.current), [])

  /** Returns true if the tour actually started, false if this player
   *  already completed it — so the caller can proceed straight to
   *  whatever comes after (the story narration) instead of waiting on a
   *  transition that won't happen. */
  const start = useCallback(() => {
    if (hasCompletedTour(sanitizedUser)) return false
    setStepIndex(0)
    setIsActive(true)
    return true
  }, [sanitizedUser])

  const finish = useCallback(() => {
    clearInterval(typingIntervalRef.current)
    markTourComplete(sanitizedUser)
    setIsActive(false)
  }, [sanitizedUser])

  const next = useCallback(() => {
    if (isTyping) {
      clearInterval(typingIntervalRef.current)
      setVisibleChars(fullText.length)
      return
    }
    if (stepIndex < INTRO_TOUR_STEPS.length - 1) {
      setStepIndex((i) => i + 1)
    } else {
      finish()
    }
  }, [isTyping, fullText.length, stepIndex, finish])

  const skip = useCallback(() => {
    finish()
  }, [finish])

  return {
    isActive,
    icon: currentStep?.icon ?? '',
    title: currentStep?.title ?? '',
    targetId: currentStep?.targetId ?? null,
    displayedText: fullText.slice(0, visibleChars),
    isTyping,
    stepNumber: stepIndex + 1,
    totalSteps: INTRO_TOUR_STEPS.length,
    isLastStep: stepIndex === INTRO_TOUR_STEPS.length - 1,
    start,
    next,
    skip,
  }
}