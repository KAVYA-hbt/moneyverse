import React, { useState, useRef } from 'react'
import { emitTelemetry } from '../../telemetry/telemetryBus.js'
import { useLanguage } from '../../i18n/LanguageContext.jsx'

// Below this decision latency, an answer is flagged (not blocked) as
// implausibly fast for genuine reading + reasoning — well under median
// human reading time for even a short question. This is a DATA QUALITY
// flag for downstream analysis, not an anti-cheat gate: legitimate fast
// answers exist (a returning player who's seen this exact question
// before), so we tag the signal rather than reject the input.
const SUSPICIOUSLY_FAST_MS = 600

export function QuestQuizModal({
  quiz,
  email,                    // player identifier — required for telemetry attribution
  questOrTreasureId = null, // e.g. active quest/treasure/npc-advisory id, for join-back analysis
  availableHints = 0,
  onUseHint,
  onSuccess,
  onRetryEasy, // Call this when 3 attempts fail to fetch an easier, different question
  onFail,
  onClose,
  title, // e.g. "Give Arjun your advice" for NPC advisory encounters
  successText,
}) {
  const { t } = useLanguage()
  const resolvedTitle = title ?? t('quiz.defaultTitle')
  const resolvedSuccessText = successText ?? t('quiz.defaultSuccessText')
  const [attempts, setAttempts] = useState(3)
  const [disabledOptions, setDisabledOptions] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [shownHint, setShownHint] = useState(null)
  const [loading, setLoading] = useState(false)

  // Captured once, at mount — this is when the question actually became
  // visible to the player, which is the correct zero-point for decision
  // latency (not "when the component was created" in some abstract
  // sense, and not re-captured on re-render, which useState(Date.now())
  // alone would risk under React 18 double-invoke in StrictMode).
  const shownAtRef = useRef(null)
  if (shownAtRef.current === null) shownAtRef.current = Date.now()

  const logAttempt = (index, correct) => {
    const now = Date.now()
    const decisionLatencyMs = now - shownAtRef.current

    // Fire-and-forget — this call never awaits, never throws into the
    // click handler, and has zero ability to block or delay the actual
    // gameplay response (setFeedback/onSuccess/onFail below run
    // regardless of telemetry outcome). This is the decoupling: the
    // event is emitted as a fact ("this happened"), not a request the
    // gameplay logic depends on.
    emitTelemetry(email, {
      type: 'quiz_attempt',
      payload: {
        quest_or_treasure_id: questOrTreasureId,
        topic: quiz?.topic ?? null,
        question_text: quiz?.question ?? null,
        options: quiz?.options ?? [],
        correct_index: quiz?.correctIndex ?? null,
        selected_index: index,
        is_correct: correct,
        difficulty: quiz?.difficulty ?? null,
        attempt_number: 4 - attempts, // 1-indexed: first click is attempt 1
        decision_latency_ms: decisionLatencyMs,
        suspicious_latency: decisionLatencyMs < SUSPICIOUSLY_FAST_MS,
      },
    })
  }

  const handleSelectOption = (index) => {

    if (disabledOptions.includes(index) || attempts <= 0 || loading) return

    if (index === quiz.correctIndex) {
      logAttempt(index, true)
      setFeedback({ type: 'success', text: resolvedSuccessText })
      setTimeout(() => {
        onSuccess(quiz.reward || 25)
      }, 1200)
    } else {
      logAttempt(index, false)
      const remainingAttempts = attempts - 1
      setAttempts(remainingAttempts)
      setDisabledOptions((prev) => [...prev, index])

      if (remainingAttempts > 0) {
        setFeedback({
          type: 'error',
          text: t('quiz.incorrectLocked', { remaining: remainingAttempts }),
        })
      } else {
        // 🚨 OUT OF TRIES: Trigger retry with a completely new easy question
        setFeedback({
          type: 'error',
          text: t('quiz.outOfTries'),
        })
        
        setTimeout(async () => {
          if (onRetryEasy) {
            setLoading(true)
            // PASS THE CURRENT QUESTION TO PREVENT REPETITION
            await onRetryEasy({ 
              previous_question: quiz.question, 
              difficulty: 'easy' 
            }) 
            
            // Reset modal state for the brand new question
            setAttempts(3)
            setDisabledOptions([])
            setFeedback(null)
            setShownHint(null)
            setLoading(false)
          } else {
            onFail()
          }
        }, 1500)
      }
    }
  }

  const handleTriggerHint = async () => {
    if (availableHints <= 0 || shownHint || loading) return
    
    setLoading(true)
    if (onUseHint) {
      const fetchedHint = await onUseHint(quiz.question)
      if (fetchedHint) {
        setShownHint(typeof fetchedHint === 'string' ? fetchedHint : fetchedHint.hint_text)
      } else if (quiz.hint) {
        setShownHint(quiz.hint)
      } else {
        setShownHint(t('quiz.defaultHint'))
      }
    } else if (quiz.hint) {
      setShownHint(quiz.hint)
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '480px',
        width: '90%',
        color: '#f8fafc',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        opacity: loading ? 0.7 : 1,
        pointerEvents: loading ? 'none' : 'auto'
      }}>
        {/* HEADER & BADGES */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '0.5px' }}>
            {resolvedTitle} {quiz.concept_tag && `• ${quiz.concept_tag}`}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{
              background: '#0284c7',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              📜 {t('quiz.hintsLabel')}: {availableHints}
            </span>

            <span style={{
              background: attempts === 1 ? '#ef4444' : '#3b82f6',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              {t('quiz.triesLabel')}: {attempts}/3
            </span>
          </div>
        </div>

        {/* QUESTION TEXT */}
        <h3 style={{ fontSize: '17px', marginBottom: '16px', lineHeight: '1.4', fontWeight: '600' }}>
          {loading ? t('quiz.fetchingNewQuestion') : quiz.question}
        </h3>

        {/* HINT SCROLL BUTTON / DISPLAY */}
        {!shownHint ? (
          <button
            onClick={handleTriggerHint}
            disabled={availableHints <= 0 || loading}
            style={{
              width: '100%',
              marginBottom: '16px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: availableHints > 0 ? '1px dashed #f59e0b' : '1px dashed #475569',
              background: availableHints > 0 ? '#451a03' : '#0f172a',
              color: availableHints > 0 ? '#fbbf24' : '#64748b',
              fontSize: '13px',
              cursor: availableHints > 0 && !loading ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {loading ? t('quiz.unrollingScroll') : t('quiz.useHintScroll', { count: availableHints })}
          </button>
        ) : (
          <div style={{
            marginBottom: '16px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: '#312e81',
            border: '1px solid #6366f1',
            color: '#e0e7ff',
            fontSize: '13px',
            lineHeight: '1.4'
          }}>
            📜 <b>{t('quiz.scrollOfWisdom')}</b> {shownHint}
          </div>
        )}

        {/* OPTIONS LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {quiz.options.map((optionText, idx) => {
            const isLocked = disabledOptions.includes(idx)
            return (
              <button
                key={idx}
                disabled={isLocked || attempts <= 0 || loading}
                onClick={() => handleSelectOption(idx)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: isLocked ? '1px solid #475569' : '1px solid #3b82f6',
                  background: isLocked ? '#0f172a' : '#334155',
                  color: isLocked ? '#64748b' : '#ffffff',
                  textAlign: 'left',
                  fontSize: '14px',
                  cursor: isLocked || loading ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.5 : 1,
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{optionText}</span>
                {isLocked && <span style={{ fontSize: '12px' }}>{t('quiz.locked')}</span>}
              </button>
            )
          })}
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div style={{
            marginTop: '16px',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 'bold',
            background: feedback.type === 'success' ? '#15803d' : '#991b1b',
            color: '#ffffff'
          }}>
            {feedback.text}
          </div>
        )}

        {/* CANCEL BUTTON */}
        <button 
          onClick={onClose} 
          disabled={loading}
          style={{
            marginTop: '16px',
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          {t('quiz.cancel')}
        </button>
      </div>
    </div>
  )
}