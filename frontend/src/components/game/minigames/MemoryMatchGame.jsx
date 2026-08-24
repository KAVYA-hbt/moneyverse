import { useState, useEffect, useMemo, useRef } from 'react'
import MiniGameShell from './MiniGameShell.jsx'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'

const DEFAULT_ICONS = ['🍎', '🍕', '🍔', '🍩', '🍰', '🍉']
const MISMATCH_DELAY_MS = 700

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function MemoryMatchGame({
  icons = DEFAULT_ICONS,
  onClose,
  onComplete, // (result: { success: boolean, moves: number }) => void
}) {
  const { t } = useLanguage()
  const deck = useMemo(() => {
    const pairs = icons.flatMap((icon, i) => [
      { id: `${i}-a`, icon },
      { id: `${i}-b`, icon },
    ])
    return shuffle(pairs)
  }, [icons])

  const [flippedIds, setFlippedIds] = useState([])
  const [matchedIcons, setMatchedIcons] = useState(new Set())
  const [moves, setMoves] = useState(0)
  const [result, setResult] = useState(null)
  const lockRef = useRef(false)

  useEffect(() => {
    if (matchedIcons.size === icons.length && icons.length > 0) {
      setResult({ success: true, message: t('minigames.memoryMatchResult', { moves }) })
    }
  }, [matchedIcons, icons.length, moves, t])

  const handleCardClick = (card) => {
    if (lockRef.current) return
    if (matchedIcons.has(card.icon)) return
    if (flippedIds.includes(card.id)) return
    if (flippedIds.length === 2) return

    const nextFlipped = [...flippedIds, card.id]
    setFlippedIds(nextFlipped)

    if (nextFlipped.length === 2) {
      lockRef.current = true
      setMoves((m) => m + 1)

      const [firstId, secondId] = nextFlipped
      const first = deck.find((c) => c.id === firstId)
      const second = deck.find((c) => c.id === secondId)

      if (first.icon === second.icon) {
        setTimeout(() => {
          setMatchedIcons((prev) => new Set(prev).add(first.icon))
          setFlippedIds([])
          lockRef.current = false
        }, 200)
      } else {
        setTimeout(() => {
          setFlippedIds([])
          lockRef.current = false
        }, MISMATCH_DELAY_MS)
      }
    }
  }

  const handleFinalClose = () => {
    onComplete?.(result || { success: false, moves })
    onClose?.()
  }

  // Bails out right now instead of forcing a full clear -- banks whatever
  // pairs are already matched as a completed (but reduced-reward, see
  // GamePage.jsx's onReward) task rather than an outright loss.
  const handleFinishEarly = () => {
    setResult({
      success: true,
      skipped: true,
      moves,
      message: t('minigames.memoryMatchPartial', { matched: matchedIcons.size, total: icons.length }),
    })
  }

  return (
    <MiniGameShell
      title={t('minigames.memoryMatchLabel')}
      instructions={t('minigames.memoryMatchInstructions')}
      onClose={handleFinalClose}
      onFinish={handleFinishEarly}
      result={result}
    >
      <div className="mm-grid">
        {deck.map((card) => {
          const isFlipped = flippedIds.includes(card.id)
          const isMatched = matchedIcons.has(card.icon)
          return (
            <button
              key={card.id}
              className={`mm-card ${isFlipped || isMatched ? 'mm-flipped' : ''} ${isMatched ? 'mm-matched' : ''}`}
              onClick={() => handleCardClick(card)}
            >
              {isFlipped || isMatched ? card.icon : '❔'}
            </button>
          )
        })}
      </div>
      <p className="mm-stats">{t('minigames.memoryMatchStats', { n: moves })}</p>
    </MiniGameShell>
  )
}