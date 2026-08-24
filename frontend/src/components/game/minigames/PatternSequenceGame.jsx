import { useState, useEffect, useRef, useCallback } from 'react'
import MiniGameShell from './MiniGameShell.jsx'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'

const TILE_COLORS = ['#ef4444', '#22d3ee', '#fbbf24', '#8b5cf6']
const ROUNDS_TO_WIN = 4
const STARTING_LIVES = 3
const SHOW_TILE_MS = 500
const GAP_MS = 250

export default function PatternSequenceGame({ onClose, onComplete }) {
  const { t } = useLanguage()
  const [round, setRound] = useState(1)
  const [sequence, setSequence] = useState([])
  const [playerIndex, setPlayerIndex] = useState(0)
  const [litTile, setLitTile] = useState(null)
  const [phase, setPhase] = useState('idle') // idle -> showing -> input -> success -> fail
  const [lives, setLives] = useState(STARTING_LIVES)
  const [result, setResult] = useState(null)
  const timeoutsRef = useRef([])

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  const playSequence = useCallback((seq) => {
    setPhase('showing')
    seq.forEach((tileIndex, i) => {
      const showAt = i * (SHOW_TILE_MS + GAP_MS)
      timeoutsRef.current.push(
        setTimeout(() => setLitTile(tileIndex), showAt)
      )
      timeoutsRef.current.push(
        setTimeout(() => setLitTile(null), showAt + SHOW_TILE_MS)
      )
    })
    timeoutsRef.current.push(
      setTimeout(() => {
        setPhase('input')
        setPlayerIndex(0)
      }, seq.length * (SHOW_TILE_MS + GAP_MS) + 150)
    )
  }, [])

  // Kick off / extend the sequence at the start of each round
  useEffect(() => {
    if (result) return
    const nextSequence = [...sequence, Math.floor(Math.random() * 4)]
    setSequence(nextSequence)
    playSequence(nextSequence)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  useEffect(() => () => clearTimeouts(), [])

  const handleTileTap = (tileIndex) => {
    if (phase !== 'input') return

    if (sequence[playerIndex] === tileIndex) {
      const nextIndex = playerIndex + 1
      if (nextIndex === sequence.length) {
        if (round >= ROUNDS_TO_WIN) {
          setPhase('success')
          setResult({ success: true, message: t('minigames.perfectSequence', { rounds: ROUNDS_TO_WIN }) })
        } else {
          setPhase('idle')
          setRound((r) => r + 1)
        }
      } else {
        setPlayerIndex(nextIndex)
      }
    } else {
      const remainingLives = lives - 1
      setLives(remainingLives)
      if (remainingLives <= 0) {
        setPhase('fail')
        setResult({ success: false, message: t('minigames.patternFail') })
      } else {
        // Retry the SAME round rather than ending the game outright —
        // keeps this low-frustration for a quick hunger-break game.
        clearTimeouts()
        playSequence(sequence)
      }
    }
  }

  const handleFinalClose = () => {
    onComplete?.(result || { success: false })
    onClose?.()
  }

  // Banks whatever round they'd reached as a completed (reduced-reward)
  // task instead of forcing them to either clear all 4 rounds or run out
  // of lives.
  const handleFinishEarly = () => {
    clearTimeouts()
    setResult({
      success: true,
      skipped: true,
      round,
      message: t('minigames.patternSequencePartial', { round }),
    })
  }

  return (
    <MiniGameShell
      title={t('minigames.patternSequenceLabel')}
      instructions={t('minigames.patternSequenceInstructions')}
      onClose={handleFinalClose}
      onFinish={handleFinishEarly}
      result={result}
    >
      <div className="ps-grid">
        {TILE_COLORS.map((color, i) => (
          <button
            key={i}
            className={`ps-tile ${litTile === i ? 'ps-lit' : ''}`}
            style={{ background: color, color }}
            disabled={phase !== 'input'}
            onClick={() => handleTileTap(i)}
          />
        ))}
      </div>
      <p className="ps-status">
        {phase === 'showing' && t('minigames.watchClosely')}
        {phase === 'input' && t('minigames.yourTurnRound', { round, total: ROUNDS_TO_WIN })}
      </p>
      <p className="ps-lives">{'❤️'.repeat(lives)}{'🖤'.repeat(STARTING_LIVES - lives)}</p>
    </MiniGameShell>
  )
}