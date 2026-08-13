import { useState, useEffect, useRef, useCallback } from 'react'
import MiniGameShell from './MiniGameShell.jsx'

const ICON_POOL = ['🍎', '🍕', '🍔', '🍩', '🍰', '🍉', '🥐', '🍪', '🍇', '🍒']
const ROUNDS_TO_WIN = 5
const STARTING_LIVES = 3
const ROUND_TIME_MS = 4000
const TICK_MS = 100

function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildRound(round) {
  const itemCount = Math.min(3 + round, 8) // gets slightly harder each round
  const shuffledPool = shuffle(ICON_POOL)
  const target = shuffledPool[0]
  const items = shuffle([target, ...shuffledPool.slice(1, itemCount)])
  return { target, items }
}

export default function QuickSortGame({ onClose, onComplete }) {
  const [round, setRound] = useState(1)
  const [roundData, setRoundData] = useState(() => buildRound(1))
  const [lives, setLives] = useState(STARTING_LIVES)
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME_MS)
  const [result, setResult] = useState(null)
  const intervalRef = useRef(null)

  const startTimer = useCallback(() => {
    clearInterval(intervalRef.current)
    setTimeLeft(ROUND_TIME_MS)
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= TICK_MS) {
          clearInterval(intervalRef.current)
          handleTimeout()
          return 0
        }
        return prev - TICK_MS
      })
    }, TICK_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    startTimer()
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  useEffect(() => () => clearInterval(intervalRef.current), [])

  const handleTimeout = () => {
    loseLife()
  }

  const loseLife = () => {
    setLives((prev) => {
      const next = prev - 1
      if (next <= 0) {
        clearInterval(intervalRef.current)
        setResult({ success: false, message: "Ran out of tries — no worries, plenty more chances around the city." })
      } else {
        const nextRoundData = buildRound(round) // retry with a fresh layout, same round number
        setRoundData(nextRoundData)
        startTimer()
      }
      return next
    })
  }

  const handleItemTap = (icon) => {
    if (result) return

    if (icon === roundData.target) {
      if (round >= ROUNDS_TO_WIN) {
        clearInterval(intervalRef.current)
        setResult({ success: true, message: `Sharp eyes — ${ROUNDS_TO_WIN} for ${ROUNDS_TO_WIN}!` })
      } else {
        const nextRound = round + 1
        setRound(nextRound)
        setRoundData(buildRound(nextRound))
      }
    } else {
      loseLife()
    }
  }

  const handleFinalClose = () => {
    onComplete?.(result || { success: false })
    onClose?.()
  }

  const timerPct = Math.max(0, Math.round((timeLeft / ROUND_TIME_MS) * 100))

  return (
    <MiniGameShell
      title="Quick Sort"
      instructions="Tap the matching item before time runs out."
      onClose={handleFinalClose}
      result={result}
    >
      <div className="qs-target">
        Find this: <span className="qs-target-icon">{roundData.target}</span>
      </div>

      <div className="qs-timer-bar">
        <div className="qs-timer-fill" style={{ width: `${timerPct}%` }} />
      </div>

      <div className="qs-grid">
        {roundData.items.map((icon, i) => (
          <button key={`${icon}-${i}`} className="qs-item" onClick={() => handleItemTap(icon)}>
            {icon}
          </button>
        ))}
      </div>

      <p className="qs-lives">{'❤️'.repeat(lives)}{'🖤'.repeat(STARTING_LIVES - lives)} · Round {round}/{ROUNDS_TO_WIN}</p>
    </MiniGameShell>
  )
}