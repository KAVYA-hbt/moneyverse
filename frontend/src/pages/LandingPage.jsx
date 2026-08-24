import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import cityView from '../assets/backgrounds/city_view.png'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement || document.webkitFullscreenElement)
      )
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Dedicated Fullscreen Toggle Handler
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen()
        }
        if (window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape').catch(() => {})
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen()
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err)
    }
  }

  const handleStartJourney = async () => {
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen()
        }
        if (window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape').catch(() => {})
        }
      }
    } catch (err) {
      console.warn('Fullscreen/Orientation lock deferred:', err)
    } finally {
      navigate('/details')
    }
  }

  return (
    <div className="landing">
      <div className="landing__bg" style={{ backgroundImage: `url(${cityView})` }} />
      <div className="landing__scrim" />

      <svg className="landing__route" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
        <path
          className="landing__route-path"
          d="M -50 900 C 300 750, 250 550, 500 480 S 900 350, 850 200 S 1100 60, 1650 20"
        />
      </svg>

      <div className="landing__milestones" aria-hidden="true">
        {[
          { n: 1, x: 9, y: 84, title: t('landing.milestoneNewcomer'), icon: '🆔' },
          { n: 2, x: 26, y: 62, title: t('landing.milestoneExplorer'), icon: '🧭' },
          { n: 3, x: 43, y: 42, title: t('landing.milestoneAchiever'), icon: '📈' },
          { n: 4, x: 60, y: 24, title: t('landing.milestoneSpecialist'), icon: '🛡️' },
          { n: 5, x: 78, y: 9, title: t('landing.milestoneMaster'), icon: '👑' },
        ].map((m) => (
          <div
            key={m.n}
            className="landing__milestone"
            style={{ left: `${m.x}%`, top: `${m.y}%`, '--delay': `${0.6 + m.n * 0.25}s` }}
          >
            <span className="landing__milestone-dot">{m.icon}</span>
            <span className="landing__milestone-label">{m.title}</span>
          </div>
        ))}
      </div>

      <div className="landing__particles" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="landing__particle" style={{ '--i': i }} />
        ))}
      </div>

      <header className="landing__header">
        <div className="landing__logo">
          <span className="landing__logo-mark">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="12" stroke="url(#logoGrad)" strokeWidth="2" />
              <path d="M13 6.5v13M9.5 9.5c0-1.4 1.5-2.5 3.5-2.5s3.5 1 3.5 2.3c0 3-7 1.7-7 4.7 0 1.3 1.5 2.3 3.5 2.3s3.5-1.1 3.5-2.5" stroke="url(#logoGrad)" strokeWidth="1.6" strokeLinecap="round" />
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="26" y2="26">
                  <stop stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="landing__logo-text">{t('landing.logo')}</span>
        </div>

        <button
          className="landing__fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? t('onboarding.exitFullscreen') : t('onboarding.enterFullscreen')}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>
      </header>

      <main className="landing__main">
        <p className="landing__eyebrow">{t('landing.eyebrow')}</p>
        <h1 className="landing__title">{t('landing.titleLine')}
          <br />
          <span className="landing__title-accent">{t('landing.titleAccent')}</span>
        </h1>
      </main>

      <button className="landing__cta landing__cta--centered" onClick={handleStartJourney}>
        <span>{t('landing.startJourney')}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="landing__bottom-right">
        <div className="landing__story-card">
          <p className="landing__subtitle">
            {t('landing.subtitle')}
          </p>

        </div>
      </div>
    </div>
  )
}