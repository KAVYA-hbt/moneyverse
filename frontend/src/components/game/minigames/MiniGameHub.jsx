import { useState } from 'react'
import MemoryMatchGame from './MemoryMatchGame.jsx'
import PatternSequenceGame from './PatternSequenceGame.jsx'
import QuickSortGame from './QuickSortGame.jsx'
import { getMiniGameProgress, recordMiniGameResult } from '../../../utils/minigameStorage.js'
import './MiniGames.css'

const GAME_OPTIONS = [
  { id: 'memory_match', label: 'Memory Match', icon: '🧠', Component: MemoryMatchGame },
  { id: 'pattern_sequence', label: 'Pattern Sequence', icon: '🎨', Component: PatternSequenceGame },
  { id: 'quick_sort', label: 'Quick Sort', icon: '⚡', Component: QuickSortGame },
]

/**
 * Full mini-game flow: shows the 3-option picker (with each game's current
 * unlocked level pulled from saved progress), launches whichever the
 * player taps, then records the result — win or lose — back into that
 * player's persisted progress before returning to the picker (or closing
 * entirely, caller's choice via onExit).
 */
export default function MiniGameHub({ sanitizedUser, onExit, onReward }) {
  const [progress, setProgress] = useState(() => getMiniGameProgress(sanitizedUser))
  const [activeGameId, setActiveGameId] = useState(null)

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
        onClose={() => setActiveGameId(null)}
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