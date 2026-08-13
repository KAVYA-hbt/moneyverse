import { useState } from 'react'
import './NoticeBoard.css'

/**
 * `notices` items: { id, icon, title, flow, done, weight, pinPosition }.
 * `flow` is the one-line task summary on the card's back (never the full
 * story). `weight` drives the progress bar — some tasks count for more
 * than others, it's not a flat "X of Y" count. `pinPosition` is null for
 * tasks with no fixed spot (wandering NPCs) — those cards simply don't
 * get a Pin button. `icon` is a placeholder portrait until a real image
 * is supplied via the `image` field.
 */
export default function NoticeBoard({ notices, isOpen, onToggle, progressPct, pinnedTaskId, onPin }) {
  const [flippedId, setFlippedId] = useState(null)

  return (
    <>
      <button className="nb-trigger" onClick={onToggle}>
        <div className="nb-trigger-board">
          {notices.slice(0, 5).map((n, i) => (
            <span key={n.id} className={`nb-trigger-pin nb-trigger-pin--${i % 4}`} />
          ))}
        </div>
        <span className="nb-trigger-label">📌 Notice Board</span>
      </button>

      {isOpen && (
        <div className="nb-overlay" onClick={onToggle}>
          <div className="nb-board" onClick={(e) => e.stopPropagation()}>
            <div className="nb-board-header">
              <h3>Notice Board</h3>
              <button className="nb-close-btn" onClick={onToggle}>✕</button>
            </div>

            <div className="nb-progress-row">
              <div className="nb-progress-track">
                <div className="nb-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="nb-progress-label">{progressPct}%</span>
            </div>

            <div className="nb-grid">
              {notices.map((notice) => {
                const isFlipped = flippedId === notice.id
                const isPinned = pinnedTaskId === notice.id
                return (
                  <button
                    key={notice.id}
                    className={`nb-card ${isFlipped ? 'nb-card--flipped' : ''} ${notice.done ? 'nb-card--done' : ''}`}
                    onClick={() => setFlippedId(isFlipped ? null : notice.id)}
                  >
                    <div className="nb-card-inner">
                      <div className="nb-card-face nb-card-front">
                        {notice.image ? (
                          <img src={notice.image} alt="" className="nb-card-portrait" />
                        ) : (
                          <span className="nb-card-icon">{notice.icon}</span>
                        )}
                        <span className="nb-card-title">{notice.title}</span>
                        {notice.done && <span className="nb-card-done-tag">✓ Done</span>}
                        {isPinned && <span className="nb-card-pin-tag">📍</span>}
                      </div>
                      <div className="nb-card-face nb-card-back">
                        <p className={`nb-card-flow ${notice.handClass || ''}`}>{notice.flow}</p>
                        {notice.pinPosition && !notice.done && (
                          <span
                            className={`nb-card-pin-btn ${isPinned ? 'nb-card-pin-btn--active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onPin(notice.id) }}
                          >
                            {isPinned ? '📍 Pinned — tap to unpin' : '📍 Pin on map'}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}