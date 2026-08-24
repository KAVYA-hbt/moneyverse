import { useState, useEffect } from 'react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import './IntroTourOverlay.css'

const HIGHLIGHT_PADDING = 6

export default function IntroTourOverlay({ tour }) {
  const { t } = useLanguage()
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!tour.isActive || !tour.targetId) {
      setRect(null)
      return
    }

    const measure = () => {
      const el = document.querySelector(`[data-intro-tour-id="${tour.targetId}"]`)
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({
        top: r.top - HIGHLIGHT_PADDING,
        left: r.left - HIGHLIGHT_PADDING,
        width: r.width + HIGHLIGHT_PADDING * 2,
        height: r.height + HIGHLIGHT_PADDING * 2,
      })
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [tour.isActive, tour.targetId, tour.stepNumber])

  if (!tour.isActive) return null

  return (
    <div className="it-overlay">
      {rect && (
        <div
          className="it-spotlight"
          style={{
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
        />
      )}

      {rect && (
        <div
          className={`it-pointer ${rect.top < 60 ? 'it-pointer--below' : 'it-pointer--above'}`}
          style={{
            left: `${rect.left + rect.width / 2}px`,
            top: rect.top < 60 ? `${rect.top + rect.height + 4}px` : `${rect.top - 4}px`,
          }}
        >
          {rect.top < 60 ? '▲' : '▼'}
        </div>
      )}

      {!rect && <div className="it-scrim" />}

      <div
        className="it-card"
        onClick={() => {
          if (tour.isTyping) tour.next()
        }}
      >
        <div className="it-icon-badge">{tour.icon}</div>

        <div className="it-body">
          <p className="it-title">{tour.title}</p>
          <p className="it-text">
            {tour.displayedText}
            {tour.isTyping && <span className="it-caret">|</span>}
          </p>

          <div className="it-progress">
            {Array.from({ length: tour.totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`it-dot ${i < tour.stepNumber ? 'it-dot--done' : ''} ${i === tour.stepNumber - 1 ? 'it-dot--active' : ''}`}
              />
            ))}
          </div>

          <div className="it-actions">
            <button className="it-skip-btn" onClick={(e) => { e.stopPropagation(); tour.skip() }}>
              {t('introTour.skip')}
            </button>
            <button className="it-next-btn" onClick={(e) => { e.stopPropagation(); tour.next() }}>
              {tour.isTyping ? t('introTour.showAll') : tour.isLastStep ? t('introTour.letsGo') : t('introTour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}