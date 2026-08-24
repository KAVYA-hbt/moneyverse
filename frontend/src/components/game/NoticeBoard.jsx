import { useLanguage } from '../../i18n/LanguageContext.jsx'
import './NoticeBoard.css'

/**
 * `notices` items: { id, icon, title, flow, done, weight, pinPosition }.
 * `flow` is the one-line task summary -- now shown directly on the card
 * front, not behind a flip (see checklist item #6: card-flipping wasn't
 * landing, text moved to the front and the image shrunk to make room).
 * `weight` drives the progress bar -- some tasks count for more than
 * others, it's not a flat "X of Y" count. `pinPosition` is null for
 * tasks with no fixed spot (wandering NPCs) -- those cards simply don't
 * get a Pin button.
 */
export default function NoticeBoard({ notices, isOpen, onToggle, progressPct, pinnedTaskId, onPin, showArrow }) {
  const { t } = useLanguage()
  return (
    <>
      <div className="nb-trigger-wrapper">
        {showArrow && (
          <div className="nb-attention-arrow" aria-hidden="true">
            <span>{t('noticeboard.checkHere')}</span>
            <div className="nb-attention-arrow-glyph">↓</div>
          </div>
        )}
        <button className="nb-trigger" onClick={onToggle}>
          <div className="nb-trigger-board">
            {notices.slice(0, 5).map((n, i) => (
              <span key={n.id} className={`nb-trigger-pin nb-trigger-pin--${i % 4}`} />
            ))}
          </div>
          <span className="nb-trigger-label">{t('noticeboard.trigger')}</span>
        </button>
      </div>

      {isOpen && (
        <div className="nb-overlay" onClick={onToggle}>
          <div className="nb-board" onClick={(e) => e.stopPropagation()}>
            <div className="nb-board-header">
              <h3>{t('noticeboard.title')}</h3>
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
                const isPinned = pinnedTaskId === notice.id
                return (
                  <div
                    key={notice.id}
                    className={`nb-card ${notice.done ? 'nb-card--done' : ''}`}
                  >
                    {notice.image ? (
                      <img src={notice.image} alt="" className="nb-card-portrait" />
                    ) : (
                      <span className="nb-card-icon">{notice.icon}</span>
                    )}
                    <span className="nb-card-title">{notice.title}</span>
                    <p className={`nb-card-flow ${notice.handClass || ''}`}>{notice.flow}</p>

                    {notice.done && <span className="nb-card-done-tag">{t('noticeboard.done')}</span>}
                    {isPinned && <span className="nb-card-pin-tag">📍</span>}

                    {notice.pinPosition && !notice.done && (
                      <button
                        className={`nb-card-pin-btn ${isPinned ? 'nb-card-pin-btn--active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onPin(notice.id) }}
                      >
                        {isPinned ? t('noticeboard.pinnedUnpin') : t('noticeboard.pinOnMap')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}