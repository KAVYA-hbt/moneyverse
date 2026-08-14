import { useState } from 'react'
import MemoryMatchGame from './MemoryMatchGame.jsx'
import PatternSequenceGame from './PatternSequenceGame.jsx'
import QuickSortGame from './QuickSortGame.jsx'
import CashFlowCatchGame from './CashFlowCatchGame.jsx'
import { getMiniGameProgress, recordMiniGameResult } from '../../../utils/minigameStorage.js'
import './MiniGames.css'

const GAME_OPTIONS = [
  { id: 'memory_match', label: 'Memory Match', icon: '\ud83e\udde0', Component: MemoryMatchGame },
  { id: 'pattern_sequence', label: 'Pattern Sequence', icon: '\ud83c\udfa8', Component: PatternSequenceGame },
  { id: 'quick_sort', label: 'Quick Sort', icon: '\u26a1', Component: QuickSortGame },
  { id: 'cash_flow_catch', label: 'Cash Flow Catch', icon: '\ud83d\udcb0', Component: CashFlowCatchGame },
]

/**
 * Full mini-game flow: shows the 3-option picker (with each game's current
 * unlocked level pulled from saved progress), launches whichever the
 * player taps, then records the result — win or lose — back into that
 * player's persisted progress before returning to the picker (or closing
 * entirely, caller's choice via onExit).
 */
export default function MiniGameHub({ sanitizedUser, onExit, onReward, forcedGameId = null }) {
  const [progress, setProgress] = useState(() => getMiniGameProgress(sanitizedUser))
  // If launched from a specific world location (one of the 3 spread-out
  // spawn points -- see GamePage.jsx), that location already implies
  // which game this is, so skip the "pick one of 3" picker screen
  // entirely and go straight into it.
  const [activeGameId, setActiveGameId] = useState(forcedGameId)

  const handleGameComplete = (gameId, result) => {
    const updated = recordMiniGameResult(sanitizedUser, gameId, {
      success: result.success,
      level: result.level,
      moves: result.moves,
      round: result.round,
    })
    setProgress(updated)
    if (result.success) {
      onReward?.(gameId, result)
    }
  }

  if (activeGameId) {
    const option = GAME_OPTIONS.find((g) => g.id === activeGameId)
    const ActiveComponent = option.Component
    const currentLevel = progress[activeGameId]?.unlockedLevel ?? 1

    return (
      <ActiveComponent
        level={currentLevel}
        onComplete={(result) => handleGameComplete(activeGameId, result)}
        // A forced (location-specific) game has no picker to fall back
        // to -- closing it means leaving the mini-game entirely, not
        // returning to a menu that shouldn't exist for this flow.
        onClose={forcedGameId ? onExit : () => setActiveGameId(null)}
      />
    )
  }

  return (
    <div className="mgh-overlay">
      <div className="mgh-modal">
        <p className="mgh-eyebrow">Pure puzzles — nothing banking-related here.</p>
        <h2 className="mgh-title">Pick a Mini-Game</h2>
        <div className="mgh-list">
          {GAME_OPTIONS.map((opt) => {
            const entry = progress[opt.id]
            return (
              <button key={opt.id} className="mgh-option" onClick={() => setActiveGameId(opt.id)}>
                <span className="mgh-option-icon">{opt.icon}</span>
                <span className="mgh-option-text">
                  <span className="mgh-option-label">{opt.label}</span>
                  <span className="mgh-option-level">Level {entry?.unlockedLevel ?? 1}</span>
                </span>
              </button>
            )
          })}
        </div>
        <button className="mgh-close-btn" onClick={onExit}>
          Not right now
        </button>
      </div>
    </div>
  )
}