import { useState, useEffect, useRef, useCallback } from 'react'
import MiniGameShell from './MiniGameShell.jsx'
import './CashFlowCatch.css'

const GOOD_ICONS = ['\ud83d\udcb0', '\ud83d\udcb5', '\ud83e\ude99', '\ud83d\udcb8']
const BAD_ICONS = ['\ud83d\udcb3', '\ud83d\udcc9', '\ud83e\uddfe', '\u26a0\ufe0f']

const TARGET_SCORE = 8
const STARTING_LIVES = 3
const FALL_DURATION_MS = 2800
const SPAWN_INTERVAL_MS = 850
const BAD_ITEM_CHANCE = 0.4

let itemIdCounter = 0
function nextItemId() {
  itemIdCounter += 1
  return itemIdCounter
}

function randomItem() {
  const isBad = Math.random() < BAD_ITEM_CHANCE
  const pool = isBad ? BAD_ICONS : GOOD_ICONS
  return {
    id: nextItemId(),
    icon: pool[Math.floor(Math.random() * pool.length)],
    isBad,
    leftPct: 8 + Math.random() * 84, // keep clear of the very edges
  }
}

/**
 * Cash Flow Catch -- savings notes fall from the top, debt/expense icons
 * fall alongside them. Tap a savings note before it lands to catch it
 * (+1 score); tap a debt icon by mistake and it costs a life. Letting
 * either kind fall past the bottom untapped is free -- missing a good
 * item isn't punished, only actively catching a bad one is, so this
 * stays a "quick reflex" break rather than another precision-under-
 * pressure quiz like Quick Sort already covers.
 */
export default function CashFlowCatchGame({ onClose, onComplete }) {
  const [items, setItems] = useState([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(STARTING_LIVES)
  const [result, setResult] = useState(null)
  const spawnIntervalRef = useRef(null)
  const resultRef = useRef(null) // mirrors `result` for use inside timeouts without a stale closure

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }, [])

  const endGame = useCallback((finalResult) => {
    if (resultRef.current) return // already ended
    resultRef.current = finalResult
    clearInterval(spawnIntervalRef.current)
    setResult(finalResult)
  }, [])

  const handleItemTap = useCallback((item) => {
    if (resultRef.current) return
    removeItem(item.id)

    if (item.isBad) {
      setLives((prev) => {
        const next = prev - 1
        if (next <= 0) {
          endGame({ success: false, message: "Caught one too many bad ones -- no worries, plenty more chances around the city." })
        }
        return next
      })
    } else {
      setScore((prev) => {
        const next = prev + 1
        if (next >= TARGET_SCORE) {
          endGame({ success: true, message: `Quick hands -- ${TARGET_SCORE} caught!` })
        }
        return next
      })
    }
  }, [removeItem, endGame])

  // Spawns a new falling item on a fixed interval, and separately lets
  // each item auto-expire (removed, no penalty either way) once its own
  // fall animation would have finished -- a per-item timeout rather than
  // a shared tick, so items spawned at different moments each get their
  // own correctly-timed expiry instead of drifting out of sync.
  useEffect(() => {
    spawnIntervalRef.current = setInterval(() => {
      if (resultRef.current) return
      const item = randomItem()
      setItems((prev) => [...prev, item])
      setTimeout(() => removeItem(item.id), FALL_DURATION_MS)
    }, SPAWN_INTERVAL_MS)

    return () => clearInterval(spawnIntervalRef.current)
  }, [removeItem])

  const handleFinalClose = () => {
    onComplete?.(result || { success: false })
    onClose?.()
  }

  return (
    <MiniGameShell
      title="Cash Flow Catch"
      instructions="Tap the savings falling down -- leave the debt alone."
      onClose={handleFinalClose}
      result={result}
    >
      <div className="cfc-stats">
        <span>{'\u2764\ufe0f'.repeat(Math.max(lives, 0))}{'\ud83e\udda8'.repeat(STARTING_LIVES - Math.max(lives, 0))}</span>
        <span>Score {score}/{TARGET_SCORE}</span>
      </div>

      <div className="cfc-field">
        {items.map((item) => (
          <button
            key={item.id}
            className={`cfc-item ${item.isBad ? 'cfc-item--bad' : 'cfc-item--good'}`}
            style={{ left: `${item.leftPct}%`, animationDuration: `${FALL_DURATION_MS}ms` }}
            onClick={() => handleItemTap(item)}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </MiniGameShell>
  )
}