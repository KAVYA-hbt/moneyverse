import { useState, useEffect, useMemo } from 'react'
import { getApiBaseUrl } from '../../utils/apiBase.js'

const LEADERBOARD_STORAGE_KEY = 'city_game_leaderboard_history'

// Default historical user records so the leaderboard isn't empty on fresh runs
const DEFAULT_HISTORY_RECORDS = [
  { id: 'hist-1', name: 'Rohan (Tech Lead)', score: 280, email: 'rohan@tech.com' },
  { id: 'hist-2', name: 'Priya S.', score: 150, email: 'priya@demo.com' },
  { id: 'hist-3', name: 'Alex M.', score: 110, email: 'alex@demo.com' },
]

/**
 * Fetch stored user history from local storage with fallback default history
 */
function getStoredHistory() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.error('Failed to load leaderboard history:', err)
  }
  return DEFAULT_HISTORY_RECORDS
}

/**
 * Save updated history to local storage
 */
function saveStoredHistory(history) {
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(history))
  } catch (err) {
    console.error('Failed to save leaderboard history:', err)
  }
}

export default function LeaderboardCard({ playerProfile, userScore }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [history, setHistory] = useState([])
  const [showFullHistory, setShowFullHistory] = useState(false)

  const currentEmail = playerProfile?.email || 'demo@example.com'
  const currentName = playerProfile?.name || 'Player'

  // Load existing history on mount or load benchmark history
  useEffect(() => {
    const localData = getStoredHistory()

    fetch(`${getApiBaseUrl()}/api/leaderboard`)
      .then((res) => (res.ok ? res.json() : null))
      .then((serverData) => {
        if (Array.isArray(serverData) && serverData.length > 0) {
          setHistory(serverData)
          saveStoredHistory(serverData)
        } else {
          setHistory(localData)
          saveStoredHistory(localData)
        }
      })
      .catch(() => {
        setHistory(localData)
        saveStoredHistory(localData)
      })
  }, [])

  // Sync active user live score into leaderboard history dynamically
  useEffect(() => {
    if (!currentName) return

    setHistory((prevHistory) => {
      const baseHistory = prevHistory.length > 0 ? prevHistory : DEFAULT_HISTORY_RECORDS

      const existingIdx = baseHistory.findIndex(
        (entry) =>
          (entry.email && entry.email === currentEmail) ||
          entry.name === currentName ||
          entry.name === `${currentName} (You)`
      )

      let updated = [...baseHistory]

      if (existingIdx >= 0) {
        const existingEntry = updated[existingIdx]
        updated[existingIdx] = {
          ...existingEntry,
          name: currentName,
          score: Math.max(existingEntry.score || 0, userScore),
          lastUpdated: new Date().toISOString(),
        }
      } else {
        updated.push({
          id: `user-${Date.now()}`,
          name: currentName,
          email: currentEmail,
          score: userScore,
          lastUpdated: new Date().toISOString(),
        })
      }

      saveStoredHistory(updated)
      return updated
    })
  }, [userScore, currentName, currentEmail])

  // Sort leaderboard by top scores
  const sortedLeaderboard = useMemo(() => {
    return [...history].sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [history])

  const visibleList = showFullHistory ? sortedLeaderboard : sortedLeaderboard.slice(0, 5)

  return (
    <div className="leaderboard-card">
      <div className="leaderboard-header">
        <h3>🏆 Live Leaderboard</h3>
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="leaderboard-list">
            {visibleList.map((player, index) => {
              const rank = index + 1
              const isUser =
                player.email === currentEmail ||
                player.name === currentName ||
                player.name === `${currentName} (You)`

              return (
                <div
                  key={player.id || player.email || index}
                  className={`leaderboard-item ${isUser ? 'current-user' : ''}`}
                >
                  <span className={`rank rank-${rank}`}>#{rank}</span>
                  <span className="player-name">
                    {player.name} {isUser ? '(You)' : ''}
                  </span>
                  <span className="player-score">{player.score} pts</span>
                </div>
              );
            })}
          </div>

          {sortedLeaderboard.length > 5 && (
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: '6px 0 0 0',
                width: '100%',
                textAlign: 'center',
              }}
              onClick={() => setShowFullHistory(!showFullHistory)}
            >
              {showFullHistory ? 'Show Top 5' : `View All History (${sortedLeaderboard.length})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}